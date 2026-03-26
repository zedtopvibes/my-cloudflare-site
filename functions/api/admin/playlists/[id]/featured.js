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

  try {
    const id = params.id;
    const { featured } = await request.json();
    
    // Check if playlist exists and not deleted
    const playlist = await env.DB.prepare(
      'SELECT id FROM playlists WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Update featured status
    await env.DB.prepare(
      'UPDATE playlists SET is_featured = ? WHERE id = ?'
    ).bind(featured ? 1 : 0, id).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      featured: featured 
    }), { headers });
    
  } catch (error) {
    console.error('Error setting featured:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}