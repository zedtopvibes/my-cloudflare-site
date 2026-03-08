export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...headers, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const formData = await request.formData();
    
    // Get form fields
    const file = formData.get('file');
    const title = formData.get('title');
    const artistName = formData.get('artist_name');
    const description = formData.get('description') || '';
    const genre = formData.get('genre') || 'Unknown';
    const releaseDate = formData.get('release_date') || null;
    const albumId = formData.get('album_id');
    const trackNumber = formData.get('track_number');
    const duration = parseInt(formData.get('duration')) || 0;
    const customFilename = formData.get('custom_filename');
    const coverFile = formData.get('cover');
    const playlistsJson = formData.get('playlists');

    // Validate required fields
    if (!file || !title || !artistName) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: file, title, and artist are required' 
      }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      });
    }

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      return new Response(JSON.stringify({ 
        error: 'File must be an audio file' 
      }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      });
    }

    // Generate filename
    const timestamp = Date.now();
    let filename;
    
    if (customFilename) {
      const clean = customFilename.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim();
      filename = `${clean}.mp3`;
    } else {
      const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      filename = `${timestamp}-${safeTitle}.mp3`;
    }
    
    const r2Key = `audio/${filename}`;

    // Upload MP3 to R2
    await env.AUDIO.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${filename}"`,
      },
      customMetadata: {
        title,
        artist: artistName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Insert into D1
    const result = await env.DB.prepare(`
      INSERT INTO tracks (title, artist, description, r2_key, filename, genre, release_date, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      title, 
      artistName, 
      description, 
      r2Key, 
      filename, 
      genre, 
      releaseDate, 
      duration
    ).run();

    const trackId = result.results[0]?.id;

    // Handle album association if selected
    if (albumId && albumId !== '') {
      await env.DB.prepare(`
        INSERT INTO album_tracks (album_id, track_id, track_number)
        VALUES (?, ?, ?)
      `).bind(albumId, trackId, trackNumber || null).run();
    }

    // Handle playlist associations
    if (playlistsJson) {
      const playlistIds = JSON.parse(playlistsJson);
      for (const playlistId of playlistIds) {
        await env.DB.prepare(`
          INSERT INTO playlist_tracks (playlist_id, track_id)
          VALUES (?, ?)
        `).bind(playlistId, trackId).run();
      }
    }

    // Handle cover art upload
    let coverUrl = null;
    if (coverFile) {
      const coverExt = coverFile.name.split('.').pop();
      const coverFilename = `covers/${trackId}-${timestamp}.${coverExt}`;
      const coverBuffer = await coverFile.arrayBuffer();
      
      await env.AUDIO.put(coverFilename, coverBuffer, {
        httpMetadata: { contentType: coverFile.type }
      });
      
      coverUrl = `/api/cover/${coverFilename.split('/').pop()}`;
      
      // Update track with cover URL
      await env.DB.prepare(
        'UPDATE tracks SET artwork_url = ? WHERE id = ?'
      ).bind(coverUrl, trackId).run();
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      id: trackId,
      title: title,
      artist: artistName,
      filename: filename,
      cover_url: coverUrl,
      duration: duration,
      message: 'Track uploaded successfully'
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Upload failed' 
    }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' } 
    });
  }
}