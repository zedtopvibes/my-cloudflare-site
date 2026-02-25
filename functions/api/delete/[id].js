export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow DELETE
  if (request.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    const id = params.id;

    // Get track info first (to get R2 key)
    const track = await env.DB.prepare(
      'SELECT r2_key FROM tracks WHERE id = ?'
    ).bind(id).first();

    if (!track) {
      return new Response(JSON.stringify({ 
        error: 'Track not found' 
      }), { status: 404, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Delete from R2
    try {
      await env.AUDIO.delete(track.r2_key);
    } catch (r2Error) {
      console.error('R2 deletion error:', r2Error);
      // Continue with DB deletion even if R2 delete fails
    }

    // Delete from D1
    await env.DB.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Track deleted successfully' 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });

  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Delete failed' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
  }
}