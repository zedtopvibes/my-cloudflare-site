export async function onRequest(context) {
  const { request, env, params } = context;
  const compilationId = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const items = await env.DB.prepare(`
      SELECT 
        ci.id,
        ci.item_id,
        ci.display_order
      FROM compilation_items ci
      WHERE ci.compilation_id = ?
      ORDER BY ci.display_order ASC
    `).bind(compilationId).all();
    
    return new Response(JSON.stringify(items.results || []), { headers });
    
  } catch (error) {
    console.error('Error fetching compilation items:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}