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
    // Updated query to join with artists table for EP artist info
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
        a.name as artist_name,
        a.slug as artist_slug,
        COUNT(et.track_id) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM eps e
      LEFT JOIN artists a ON e.artist_id = a.id
      LEFT JOIN ep_tracks et ON e.id = et.ep_id
      LEFT JOIN tracks t ON et.track_id = t.id
      GROUP BY e.id
      ORDER BY e.release_date DESC
    `).all();
    
    // Process results to add backward compatibility fields
    const processedResults = results.map(ep => ({
      ...ep,
      // Add artist field for backward compatibility
      artist: ep.artist_name || 'Unknown Artist'
    }));
    
    return new Response(JSON.stringify(processedResults), { headers });
    
  } catch (error) {
    console.error('Error fetching EPs:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
