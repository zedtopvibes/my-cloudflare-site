export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const track = await env.DB.prepare(
      'SELECT * FROM tracks WHERE id = ?'
    ).bind(params.id).first();
    
    if (!track) {
      return new Response('Track not found', { status: 404, headers });
    }
    
    // Get featured artists as array
    const { results: featuredArtists } = await env.DB.prepare(`
      SELECT 
        id,
        track_id,
        artist_name,
        artist_slug,
        artist_id,
        created_at
      FROM featured_artists 
      WHERE track_id = ?
      ORDER BY id
    `).bind(params.id).all();
    
    // Return track with featured artists
    return new Response(JSON.stringify({
      ...track,
      featured_artists: featuredArtists
    }), { headers });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}