export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        t.id,
        t.title,
        t.artist,
        t.description,
        t.artwork_url,
        t.r2_key,
        t.filename,
        t.duration,
        t.genre,
        t.plays,
        t.downloads,
        t.views,
        t.slug,
        t.artist_slug,
        t.uploaded_at,
        (
          SELECT GROUP_CONCAT(artist_name, ', ')
          FROM featured_artists 
          WHERE track_id = t.id
        ) as featured_artists_list,
        (
          SELECT COUNT(*) 
          FROM featured_artists 
          WHERE track_id = t.id
        ) as featured_count
      FROM tracks t
      ORDER BY t.uploaded_at DESC
    `).all();
    
    return new Response(JSON.stringify(results), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}