export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const id = params.id;
    
    // Get playlist details - use .first() to get single object
    const playlist = await env.DB.prepare(`
      SELECT * FROM playlists WHERE id = ?
    `).bind(id).first();
    
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in this playlist
    const { results: tracks } = await env.DB.prepare(`
      SELECT 
        t.*,
        pt.position
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
    `).bind(id).all();
    
    // Add tracks to playlist object
    playlist.tracks = tracks || [];
    
    return new Response(JSON.stringify(playlist), { headers });
    
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}