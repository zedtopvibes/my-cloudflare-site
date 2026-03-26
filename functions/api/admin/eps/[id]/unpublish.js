export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  const id = params.id;

  try {
    const ep = await env.DB.prepare(
      'SELECT id, status FROM eps WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found' }), { 
        status: 404, 
        headers 
      });
    }

    if (ep.status === 'draft') {
      return new Response(JSON.stringify({ 
        error: 'EP is already a draft' 
      }), { status: 400, headers });
    }

    await env.DB.prepare(`
      UPDATE eps 
      SET status = 'draft' 
      WHERE id = ?
    `).bind(id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'EP unpublished and moved to drafts'
    }), { headers });

  } catch (error) {
    console.error('Error unpublishing EP:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}