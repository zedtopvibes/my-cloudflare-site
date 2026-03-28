export async function onRequest(context) {
  const { request, env, params } = context;
  const genre = decodeURIComponent(params.genre);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        e.id,
        e.title,
        e.slug,
        e.cover_url,
        e.release_date,
        e.genre,
        e.plays,
        e.downloads,
        e.views,
        e.is_featured,
        ar.name as artist_name,
        ar.slug as artist_slug,
        (SELECT COUNT(*) FROM ep_tracks WHERE ep_id = e.id) as track_count
      FROM eps e
      LEFT JOIN artists ar ON e.artist_id = ar.id
      WHERE e.deleted_at IS NULL 
        AND e.status = 'published'
        AND e.genre = ?
      ORDER BY e.is_featured DESC, e.plays DESC
    `).bind(genre).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching EPs by genre:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}