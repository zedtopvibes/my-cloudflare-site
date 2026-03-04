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

  // ==================== POST - ADD TRACK TO ALBUM ====================
  if (request.method === 'POST') {
    try {
      const { track_id } = await request.json();
      
      console.log('📌 Adding track:', { albumId, track_id });

      // Check if track exists in tracks table
      const trackExists = await env.DB.prepare(`
        SELECT id FROM tracks WHERE id = ?
      `).bind(track_id).first();

      if (!trackExists) {
        return new Response(JSON.stringify({ 
          error: 'Track does not exist' 
        }), { status: 404, headers });
      }

      // Check if track already exists in ANY album
      const existing = await env.DB.prepare(`
        SELECT a.title as album_title 
        FROM album_tracks at
        JOIN albums a ON at.album_id = a.id
        WHERE at.track_id = ?
      `).bind(track_id).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: `Track is already in album: ${existing.album_title}` 
        }), { status: 400, headers });
      }
      
      // Get current max track number for this album
      const maxTrack = await env.DB.prepare(`
        SELECT MAX(track_number) as max_num 
        FROM album_tracks 
        WHERE album_id = ?
      `).bind(albumId).first();
      
      const trackNumber = (maxTrack?.max_num || 0) + 1;

      // Insert into album_tracks
      await env.DB.prepare(`
        INSERT INTO album_tracks (album_id, track_id, track_number, disc_number)
        VALUES (?, ?, ?, ?)
      `).bind(albumId, track_id, trackNumber, 1).run();

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Track added successfully',
        track_number: trackNumber
      }), { headers });

    } catch (error) {
      console.error('❌ Error adding track:', error);
      return new Response(JSON.stringify({ 
        error: error.message 
      }), { status: 500, headers });
    }
  }

  // ==================== DELETE - REMOVE TRACK FROM ALBUM ====================
  if (request.method === 'DELETE') {
    try {
      // Get trackId from params (automatically from [trackId].js filename)
      const trackId = params.trackId;
      
      console.log('🗑️ Removing track:', { albumId, trackId });

      // Validate IDs
      if (!albumId || !trackId) {
        return new Response(JSON.stringify({ 
          error: 'Missing album ID or track ID',
          params: params
        }), { status: 400, headers });
      }

      // Convert to numbers (they come as strings)
      const albumIdNum = parseInt(albumId);
      const trackIdNum = parseInt(trackId);

      // Check if the relationship exists
      const exists = await env.DB.prepare(`
        SELECT * FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumIdNum, trackIdNum).first();
      
      if (!exists) {
        return new Response(JSON.stringify({ 
          error: 'Track not found in this album',
          album_id: albumIdNum,
          track_id: trackIdNum
        }), { status: 404, headers });
      }

      // Delete the relationship
      await env.DB.prepare(`
        DELETE FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumIdNum, trackIdNum).run();

      // Reorder remaining tracks to keep track numbers sequential
      const remaining = await env.DB.prepare(`
        SELECT track_id FROM album_tracks 
        WHERE album_id = ? 
        ORDER BY track_number
      `).bind(albumIdNum).all();

      for (let i = 0; i < remaining.results.length; i++) {
        await env.DB.prepare(`
          UPDATE album_tracks 
          SET track_number = ? 
          WHERE album_id = ? AND track_id = ?
        `).bind(i + 1, albumIdNum, remaining.results[i].track_id).run();
      }

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Track removed successfully'
      }), { headers });

    } catch (error) {
      console.error('❌ Error removing track:', error);
      return new Response(JSON.stringify({ 
        error: error.message 
      }), { status: 500, headers });
    }
  }

  // If we get here, method not allowed
  return new Response(JSON.stringify({ 
    error: 'Method not allowed',
    allowed_methods: ['POST', 'DELETE', 'OPTIONS']
  }), { status: 405, headers });
}