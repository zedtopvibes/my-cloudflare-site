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
    // Updated query to join with artists table for album artist info
    const { results } = await env.DB.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.cover_url,
        a.slug,
        a.release_date,
        a.plays,
        a.created_at,
        a.updated_at,
        a.artist_id,
        ar.name as artist_name,
        ar.slug as artist_slug,
        COUNT(at.track_id) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      LEFT JOIN album_tracks at ON a.id = at.album_id
      LEFT JOIN tracks t ON at.track_id = t.id
      GROUP BY a.id
      ORDER BY a.release_date DESC
    `).all();
    
    // Process results to add backward compatibility fields
    const processedResults = results.map(album => ({
      ...album,
      // Add artist field for backward compatibility
      artist: album.artist_name || 'Unknown Artist'
    }));
    
    return new Response(JSON.stringify(processedResults), { headers });
    
  } catch (error) {
    console.error('Error fetching albums:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
