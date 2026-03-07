export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // ONLY allow DELETE
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use DELETE',
      allowed: ['DELETE', 'OPTIONS']
    }), { status: 405, headers });
  }

  try {
    // Get IDs from URL params
    const albumId = params.id;
    const trackId = params.trackId;
    
    console.log('🗑️ Removing track:', { albumId, trackId });

    if (!albumId || !trackId) {
      return new Response(JSON.stringify({ 
        error: 'Missing album ID or track ID',
        params: params
      }), { status: 400, headers });
    }

    // Check if the relationship exists in album_tracks table
    const exists = await env.DB.prepare(
      'SELECT * FROM album_tracks WHERE album_id = ? AND track_id = ?'
    ).bind(albumId, trackId).first();

    if (!exists) {
      return new Response(JSON.stringify({ 
        error: 'Track not found in this album'
      }), { status: 404, headers });
    }

    // Delete the relationship
    await env.DB.prepare(
      'DELETE FROM album_tracks WHERE album_id = ? AND track_id = ?'
    ).bind(albumId, trackId).run();

    // Optional: Reorder remaining tracks
    const remaining = await env.DB.prepare(
      'SELECT track_id FROM album_tracks WHERE album_id = ? ORDER BY track_number'
    ).bind(albumId).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await env.DB.prepare(
        'UPDATE album_tracks SET track_number = ? WHERE album_id = ? AND track_id = ?'
      ).bind(i + 1, albumId, remaining.results[i].track_id).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Track removed from album successfully'
    }), { headers });

  } catch (error) {
    console.error('❌ Error removing track:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { status: 500, headers });
  }
}