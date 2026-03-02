export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
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
    // Get all albums with their track stats
    const { results } = await env.DB.prepare(`
      SELECT 
        a.*,
        a.cover_url,  -- ← ADDED THIS LINE!
        COUNT(at.track_id) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM albums a
      LEFT JOIN album_tracks at ON a.id = at.album_id
      LEFT JOIN tracks t ON at.track_id = t.id
      GROUP BY a.id
      ORDER BY a.release_date DESC
    `).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching albums:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}