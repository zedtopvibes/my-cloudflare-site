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
        a.id,
        a.title,
        a.slug,
        a.cover_url,
        a.release_date,
        a.genre,
        a.plays,
        a.downloads,
        a.views,
        a.is_featured,
        ar.name as artist_name,
        ar.slug as artist_slug,
        (SELECT COUNT(*) FROM album_tracks WHERE album_id = a.id) as track_count
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      WHERE a.deleted_at IS NULL 
        AND a.status = 'published'
        AND a.genre = ?
      ORDER BY a.is_featured DESC, a.plays DESC
    `).bind(genre).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching albums by genre:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}