export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const artistId = params.id;
    const { featured } = await request.json();

    // Check if artist exists
    const artist = await env.DB.prepare(
      'SELECT id FROM artists WHERE id = ?'
    ).bind(artistId).first();

    if (!artist) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), { 
        status: 404, 
        headers 
      });
    }

    // Update featured status
    await env.DB.prepare(
      'UPDATE artists SET is_featured = ? WHERE id = ?'
    ).bind(featured ? 1 : 0, artistId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      featured: featured 
    }), { headers });

  } catch (error) {
    console.error('Error setting featured:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}