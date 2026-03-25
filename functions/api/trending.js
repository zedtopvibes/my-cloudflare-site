export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Updated query to join with track_artists and artists tables
    const { results } = await env.DB.prepare(`
      SELECT 
        t.id,
        t.title,
        t.artwork_url,
        t.plays,
        t.views,
        t.slug,
        t.duration,
        json_group_array(
          json_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug,
            'is_primary', ta.is_primary,
            'display_order', ta.display_order
          )
          ORDER BY ta.display_order ASC, ta.is_primary DESC
        ) as artists
      FROM tracks t
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.id
      ORDER BY t.plays DESC 
      LIMIT 10
    `).all();
    
    // Process results to parse the JSON artists string
    const processedResults = results.map(track => ({
      ...track,
      artists: track.artists ? JSON.parse(track.artists) : [],
      // Add a convenience field for the primary artist name (for backward compatibility)
      artist: track.artists && track.artists.length > 0 ? 
        (JSON.parse(track.artists).find(a => a.is_primary === 1) || JSON.parse(track.artists)[0]).name : 
        'Unknown Artist'
    }));
    
    return new Response(JSON.stringify(processedResults), { headers });
  } catch (error) {
    console.error('Error fetching trending tracks:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}