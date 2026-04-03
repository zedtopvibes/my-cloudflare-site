export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;
  
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
    const compilation = await env.DB.prepare(`
      SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL
    `).bind(id).first();
    
    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    await env.DB.prepare(`
      UPDATE compilations SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(id).run();
    
    return new Response(JSON.stringify({ success: true, status: 'draft' }), { headers });
    
  } catch (error) {
    console.error('Error unpublishing compilation:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}