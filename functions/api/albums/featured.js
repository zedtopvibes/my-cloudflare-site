export async function onRequest(context) {
  const { request, env } = context;
  
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
    // Get featured albums
    const { results } = await env.DB.prepare(`
      SELECT 
        a.*,
        COUNT(at.track_id) as track_count
      FROM albums a
      LEFT JOIN album_tracks at ON a.id = at.album_id
      WHERE a.is_featured = 1
      GROUP BY a.id
      ORDER BY a.release_date DESC
      LIMIT 5
    `).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching featured albums:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}