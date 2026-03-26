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
    // Check if track exists and is not deleted
    const track = await env.DB.prepare(
      'SELECT id, status FROM tracks WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), { 
        status: 404, 
        headers 
      });
    }

    if (track.status === 'draft') {
      return new Response(JSON.stringify({ 
        error: 'Track is already a draft' 
      }), { status: 400, headers });
    }

    // Unpublish the track (set to draft)
    await env.DB.prepare(`
      UPDATE tracks 
      SET status = 'draft' 
      WHERE id = ?
    `).bind(id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Track unpublished and moved to drafts'
    }), { headers });

  } catch (error) {
    console.error('Error unpublishing track:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}