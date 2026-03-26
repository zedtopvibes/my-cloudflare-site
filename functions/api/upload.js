// =====================================================
// SIMPLIFIED UPLOAD HANDLER - NO ID3 PROCESSING
// WITH DRAFT/PUBLISH SUPPORT
// =====================================================

export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const genre = formData.get('genre') || '';
    const duration = parseInt(formData.get('duration')) || 0;
    const releaseDate = formData.get('release_date') || '';
    const bpm = formData.get('bpm') || '0';
    const explicit = formData.get('explicit') === '1';
    const featured = formData.get('featured') === '1';
    const editorPick = formData.get('editor_pick') === '1';
    
    const trackNumber = formData.get('trackNumber') || '1';
    const albumId = formData.get('album_id') || '';

    // NEW: Get status from form (draft or publish)
    const action = formData.get('action') || 'publish'; // 'draft' or 'publish'
    const status = action === 'publish' ? 'published' : 'draft';

    // Get artist data
    const mainArtistId = parseInt(formData.get('main_artist_id'));
    let featuredArtistsIds = [];
    try {
      const featuredArtists = formData.getAll('featured_artists[]');
      featuredArtistsIds = featuredArtists.filter(id => id && id !== '').map(id => parseInt(id));
    } catch (e) {
      // No featured artists
    }

    if (!file || !title || !mainArtistId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: file, title, and main artist are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    if (!file.type.startsWith('audio/')) {
      return new Response(JSON.stringify({ error: 'File must be an audio file' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Verify main artist exists
    const artistCheck = await env.DB.prepare(`
      SELECT id FROM artists WHERE id = ?
    `).bind(mainArtistId).first();
    
    if (!artistCheck) {
      return new Response(JSON.stringify({ error: 'Main artist not found' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Verify featured artists exist
    if (featuredArtistsIds.length > 0) {
      const placeholders = featuredArtistsIds.map(() => '?').join(',');
      const featuredCheck = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM artists WHERE id IN (${placeholders})
      `).bind(...featuredArtistsIds).first();
      
      if (featuredCheck.count !== featuredArtistsIds.length) {
        return new Response(JSON.stringify({ error: 'One or more featured artists not found' }), 
          { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
      }
    }

    // =====================================================
    // UPLOAD ARTWORK TO R2 (if provided)
    // =====================================================
    let artworkUrl = null;
    const artworkFile = formData.get('artwork');

    if (artworkFile && artworkFile.size > 0) {
      try {
        if (artworkFile.type.startsWith('image/')) {
          let artworkExt = artworkFile.type.split('/')[1] || 'jpg';
          if (artworkExt === 'jpeg') artworkExt = 'jpg';
          
          const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
          const timestamp = Date.now();
          const artworkFilename = `covers/${timestamp}-${safeTitle}.${artworkExt}`;
          
          await env.AUDIO.put(artworkFilename, await artworkFile.arrayBuffer(), {
            httpMetadata: { contentType: artworkFile.type }
          });
          
          artworkUrl = `/api/cover/${timestamp}-${safeTitle}.${artworkExt}`;
        }
      } catch (err) {
        console.error('Artwork upload failed:', err);
      }
    }

    // =====================================================
    // SIMPLE FILE UPLOAD - NO ID3 PROCESSING
    // =====================================================
    
    // Get artist name for filename
    const mainArtist = await env.DB.prepare(`
      SELECT name FROM artists WHERE id = ?
    `).bind(mainArtistId).first();
    const mainArtistName = mainArtist ? mainArtist.name : 'Unknown Artist';
    
    // Generate filename from artist and title
    const cleanArtist = mainArtistName.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 30);
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 50);
    const filename = `${cleanArtist} - ${cleanTitle}.mp3`;
    
    // Upload original file directly to R2 (no processing)
    await env.AUDIO.put(filename, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: 'audio/mpeg',
        contentDisposition: `inline; filename="${filename}"`,
      },
      customMetadata: {
        title,
        artist: mainArtistName,
        uploadedAt: new Date().toISOString(),
        status // NEW: Store status in metadata
      },
    });

    // =====================================================
    // D1 DATABASE OPERATIONS
    // =====================================================
    
    // Insert track with status field
    const result = await env.DB.prepare(`
      INSERT INTO tracks (
        title, 
        description, 
        r2_key, 
        filename, 
        genre, 
        duration, 
        artwork_url,
        release_date,
        bpm,
        explicit,
        featured,
        editor_pick,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      title, 
      description, 
      filename, 
      filename, 
      genre, 
      Math.round(duration / 1000),  // Convert ms to seconds
      artworkUrl,
      releaseDate || null,
      parseInt(bpm) || 0,
      explicit ? 1 : 0,
      featured ? 1 : 0,
      editorPick ? 1 : 0,
      status  // NEW: Insert status
    ).run();

    const trackId = result.results[0]?.id;

    if (!trackId) {
      throw new Error('Failed to create track record');
    }

    // Insert track artists into junction table
    if (trackId && mainArtistId) {
      // Insert main artist
      await env.DB.prepare(`
        INSERT INTO track_artists (track_id, artist_id, is_primary, display_order)
        VALUES (?, ?, ?, ?)
      `).bind(trackId, mainArtistId, 1, 0).run();
      
      // Insert featured artists
      for (let i = 0; i < featuredArtistsIds.length; i++) {
        await env.DB.prepare(`
          INSERT INTO track_artists (track_id, artist_id, is_primary, display_order)
          VALUES (?, ?, ?, ?)
        `).bind(trackId, featuredArtistsIds[i], 0, i + 1).run();
      }
    }

    // Album association
    if (albumId && trackId) {
      try {
        await env.DB.prepare(`
          INSERT INTO album_tracks (album_id, track_id, track_number)
          VALUES (?, ?, ?)
        `).bind(parseInt(albumId), trackId, parseInt(trackNumber) || 1).run();
      } catch (err) {
        console.error('Failed to add track to album:', err);
      }
    }

    // Return success response with status info
    return new Response(JSON.stringify({ 
      success: true, 
      id: trackId,
      message: status === 'published' ? 'Track published successfully!' : 'Track saved as draft',
      status: status,
      filename,
      artwork_url: artworkUrl,
      duration: Math.round(duration / 1000)
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Upload failed' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
  }
}