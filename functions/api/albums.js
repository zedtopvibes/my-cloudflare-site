export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.cover_url,
        a.release_date,
        a.genre,
        a.label,
        a.plays,
        a.downloads,
        a.views,
        a.slug,
        a.is_featured,
        a.created_at,
        a.updated_at,
        a.artist_id,
        ar.name as artist_name,
        ar.slug as artist_slug
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      WHERE a.deleted_at IS NULL
        AND a.status = 'published'
      ORDER BY a.created_at DESC
    `).all();
    
    const processedResults = results.map(album => ({
      ...album,
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