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
    const playlist = await env.DB.prepare(
      'SELECT id, status FROM playlists WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }

    if (playlist.status === 'published') {
      return new Response(JSON.stringify({ 
        error: 'Playlist is already published' 
      }), { status: 400, headers });
    }

    await env.DB.prepare(`
      UPDATE playlists 
      SET status = 'published' 
      WHERE id = ?
    `).bind(id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Playlist published successfully'
    }), { headers });

  } catch (error) {
    console.error('Error publishing playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}