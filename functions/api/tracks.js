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
        id,
        title,
        artist,
        description,
        artwork_url,
        r2_key,
        filename,
        duration,
        genre,
        plays,
        downloads,
        views,
        slug,
        artist_slug,
        uploaded_at
      FROM tracks 
      ORDER BY uploaded_at DESC
    `).all();
    
    return new Response(JSON.stringify(results), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}