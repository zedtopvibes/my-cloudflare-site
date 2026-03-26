export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        p.*,
        COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      WHERE p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}