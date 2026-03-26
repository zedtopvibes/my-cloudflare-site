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
    const album = await env.DB.prepare(
      'SELECT id, status FROM albums WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
        status: 404, 
        headers 
      });
    }

    if (album.status === 'draft') {
      return new Response(JSON.stringify({ 
        error: 'Album is already a draft' 
      }), { status: 400, headers });
    }

    await env.DB.prepare(`
      UPDATE albums 
      SET status = 'draft' 
      WHERE id = ?
    `).bind(id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Album unpublished and moved to drafts'
    }), { headers });

  } catch (error) {
    console.error('Error unpublishing album:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}