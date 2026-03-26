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
    const id = params.id;
    
    const ep = await env.DB.prepare(
      'SELECT id FROM eps WHERE id = ? AND deleted_at IS NOT NULL'
    ).bind(id).first();
    
    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found in trash' }), { 
        status: 404, 
        headers 
      });
    }
    
    await env.DB.prepare(`
      UPDATE eps 
      SET deleted_at = NULL 
      WHERE id = ?
    `).bind(id).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'EP restored successfully'
    }), { headers });
    
  } catch (error) {
    console.error('Error restoring EP:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}