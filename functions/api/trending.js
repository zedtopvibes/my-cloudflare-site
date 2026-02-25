export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, title, artist, plays FROM tracks ORDER BY plays DESC LIMIT 5'
    ).all();
    
    return new Response(JSON.stringify(results), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}