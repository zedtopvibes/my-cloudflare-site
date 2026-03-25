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
    // Get featured EPs with artist info
    const { results } = await env.DB.prepare(`
      SELECT 
        e.id,
        e.title,
        e.description,
        e.cover_url,
        e.slug,
        e.release_date,
        e.plays,
        e.created_at,
        e.updated_at,
        e.artist_id,
        e.is_featured,
        a.name as artist_name,
        a.slug as artist_slug,
        COUNT(et.track_id) as track_count
      FROM eps e
      LEFT JOIN artists a ON e.artist_id = a.id
      LEFT JOIN ep_tracks et ON e.id = et.ep_id
      WHERE e.is_featured = 1
      GROUP BY e.id
      ORDER BY e.release_date DESC
      LIMIT 5
    `).all();
    
    // Process results to add backward compatibility fields
    const processedResults = results.map(ep => ({
      ...ep,
      // Add artist field for backward compatibility
      artist: ep.artist_name || 'Unknown Artist'
    }));
    
    return new Response(JSON.stringify(processedResults), { headers });
    
  } catch (error) {
    console.error('Error fetching featured EPs:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}