export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // ONLY allow DELETE requests
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      allowed: ['DELETE', 'OPTIONS']
    }), { status: 405, headers });
  }

  try {
    // Get IDs from params - Cloudflare automatically populates these from the URL pattern
    const albumId = params.id;
    const trackId = params.trackId;
    
    console.log('🗑️ Attempting to remove track:', { albumId, trackId });

    // Validate we have both IDs
    if (!albumId || !trackId) {
      return new Response(JSON.stringify({ 
        error: 'Missing album ID or track ID',
        params: params
      }), { status: 400, headers });
    }

    // Check if the relationship exists
    const exists = await env.DB.prepare(`
      SELECT * FROM album_tracks 
      WHERE album_id = ? AND track_id = ?
    `).bind(albumId, trackId).first();
    
    if (!exists) {
      return new Response(JSON.stringify({ 
        error: 'Track not found in this album',
        album_id: albumId,
        track_id: trackId
      }), { status: 404, headers });
    }

    // Delete the relationship
    const result = await env.DB.prepare(`
      DELETE FROM album_tracks 
      WHERE album_id = ? AND track_id = ?
    `).bind(albumId, trackId).run();

    console.log('✅ Delete successful:', result);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Track removed from album successfully'
    }), { headers });

  } catch (error) {
    console.error('❌ Error removing track:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { status: 500, headers });
  }
}