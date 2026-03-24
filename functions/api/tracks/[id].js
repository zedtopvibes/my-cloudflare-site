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
    
    return new Response(JSON.stringify(track), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}