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

  const epId = params.id;

  // POST - Add track to EP
  if (request.method === 'POST') {
    try {
      const { track_id } = await request.json();
      
      // Get current max track number
      const maxTrack = await env.DB.prepare(`
        SELECT MAX(track_number) as max_num 
        FROM ep_tracks 
        WHERE ep_id = ?
      `).bind(epId).first();
      
      const trackNumber = (maxTrack?.max_num || 0) + 1;

      await env.DB.prepare(`
        INSERT INTO ep_tracks (ep_id, track_id, track_number)
        VALUES (?, ?, ?)
      `).bind(epId, track_id, trackNumber).run();

      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error adding track to EP:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove track from EP
  if (request.method === 'DELETE') {
    try {
      // Get track_id from URL path
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const trackId = pathParts[pathParts.length - 1];

      await env.DB.prepare(`
        DELETE FROM ep_tracks 
        WHERE ep_id = ? AND track_id = ?
      `).bind(epId, trackId).run();

      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error removing track from EP:', error);
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