export async function onRequest(context) {
  const { request, env, params } = context;
  const compilationId = params.id;
  const itemId = params.itemId;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const result = await env.DB.prepare(`
      DELETE FROM compilation_items 
      WHERE id = ? AND compilation_id = ?
    `).bind(itemId, compilationId).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Item not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    return new Response(JSON.stringify({ success: true }), { headers });
    
  } catch (error) {
    console.error('Error removing item:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}