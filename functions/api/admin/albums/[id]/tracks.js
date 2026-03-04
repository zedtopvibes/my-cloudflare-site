export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const albumId = params.id;

  // POST - Add track to album
  if (request.method === 'POST') {
    try {
      const { track_id } = await request.json();
      
      // Check if track already exists in ANY album
      const existing = await env.DB.prepare(`
        SELECT a.title as album_title, at.album_id 
        FROM album_tracks at
        JOIN albums a ON at.album_id = a.id
        WHERE at.track_id = ?
      `).bind(track_id).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: `Track is already in album: ${existing.album_title}` 
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Get current max track number
      const maxTrack = await env.DB.prepare(`
        SELECT MAX(track_number) as max_num 
        FROM album_tracks 
        WHERE album_id = ?
      `).bind(albumId).first();
      
      const trackNumber = (maxTrack?.max_num || 0) + 1;

      await env.DB.prepare(`
        INSERT INTO album_tracks (album_id, track_id, track_number)
        VALUES (?, ?, ?)
      `).bind(albumId, track_id, trackNumber).run();

      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error adding track to album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove track from album
  if (request.method === 'DELETE') {
    try {
      // Get track_id from URL path
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const trackId = pathParts[pathParts.length - 1];

      await env.DB.prepare(`
        DELETE FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumId, trackId).run();

      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error removing track from album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}