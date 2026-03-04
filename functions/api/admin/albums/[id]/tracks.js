export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const albumId = params.id;
  const trackId = params.trackId; // This comes from the URL pattern [trackId].js

  // ==================== POST - ADD TRACK TO ALBUM ====================
  if (request.method === 'POST') {
    try {
      // For POST, trackId comes from request body, not URL params
      const { track_id } = await request.json();
      
      console.log(`📌 Adding track ${track_id} to album ${albumId}`);

      // Check if track already exists in ANY album
      const existing = await env.DB.prepare(`
        SELECT a.title as album_title, at.album_id 
        FROM album_tracks at
        JOIN albums a ON at.album_id = a.id
        WHERE at.track_id = ?
      `).bind(track_id).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: `Track is already in album: ${existing.album_title}`,
          album_id: existing.album_id
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Get current max track number for this album
      const maxTrack = await env.DB.prepare(`
        SELECT MAX(track_number) as max_num 
        FROM album_tracks 
        WHERE album_id = ?
      `).bind(albumId).first();
      
      const trackNumber = (maxTrack?.max_num || 0) + 1;

      // Insert the track into the album
      await env.DB.prepare(`
        INSERT INTO album_tracks (album_id, track_id, track_number)
        VALUES (?, ?, ?)
      `).bind(albumId, track_id, trackNumber).run();

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Track added to album successfully',
        track_number: trackNumber
      }), { headers });

    } catch (error) {
      console.error('❌ Error adding track to album:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), { 
        status: 500, 
        headers 
      });
    }
  }

  // ==================== DELETE - REMOVE TRACK FROM ALBUM ====================
  if (request.method === 'DELETE') {
    try {
      console.log('📌 DELETE request received');
      console.log('📌 Album ID from params:', albumId);
      console.log('📌 Track ID from params:', trackId);
      
      // Validate that we have both IDs
      if (!albumId || !trackId) {
        return new Response(JSON.stringify({ 
          error: 'Missing album ID or track ID',
          params: params
        }), { status: 400, headers });
      }

      // Check if album_tracks table exists
      const tableCheck = await env.DB.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='album_tracks'
      `).first();
      
      if (!tableCheck) {
        return new Response(JSON.stringify({ 
          error: 'album_tracks table does not exist',
          solution: 'Run: CREATE TABLE album_tracks (album_id INTEGER, track_id INTEGER, track_number INTEGER)'
        }), { status: 500, headers });
      }

      // Check if the relationship exists
      const exists = await env.DB.prepare(`
        SELECT * FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumId, trackId).first();
      
      if (!exists) {
        return new Response(JSON.stringify({ 
          error: 'Track not found in this album',
          album_id: albumId,
          track_id: trackId
        }), { status: 404, headers });
      }

      // Delete the relationship
      await env.DB.prepare(`
        DELETE FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumId, trackId).run();

      // OPTIONAL: Reorder remaining tracks to keep track numbers sequential
      // Get remaining tracks in order
      const remaining = await env.DB.prepare(`
        SELECT track_id FROM album_tracks 
        WHERE album_id = ? 
        ORDER BY track_number
      `).bind(albumId).all();

      // Update track numbers to be sequential (1,2,3...)
      for (let i = 0; i < remaining.results.length; i++) {
        await env.DB.prepare(`
          UPDATE album_tracks 
          SET track_number = ? 
          WHERE album_id = ? AND track_id = ?
        `).bind(i + 1, albumId, remaining.results[i].track_id).run();
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Track removed from album successfully',
        album_id: albumId,
        track_id: trackId
      }), { headers });

    } catch (error) {
      console.error('❌ Error removing track from album:', error);
      console.error('📝 Error stack:', error.stack);
      
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        params: params
      }), { status: 500, headers });
    }
  }

  // If we get here, method not allowed
  return new Response(JSON.stringify({ 
    error: 'Method not allowed',
    allowed_methods: ['POST', 'DELETE', 'OPTIONS']
  }), { 
    status: 405, 
    headers 
  });
}