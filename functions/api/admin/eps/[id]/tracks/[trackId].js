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
    const epId = params.id;
    const trackId = params.trackId;
    
    console.log('🗑️ Removing track:', { epId, trackId });

    if (!epId || !trackId) {
      return new Response(JSON.stringify({ 
        error: 'Missing EP ID or track ID',
        params: params
      }), { status: 400, headers });
    }

    // Check if the relationship exists in ep_tracks table
    const exists = await env.DB.prepare(
      'SELECT * FROM ep_tracks WHERE ep_id = ? AND track_id = ?'
    ).bind(epId, trackId).first();

    if (!exists) {
      return new Response(JSON.stringify({ 
        error: 'Track not found in this EP'
      }), { status: 404, headers });
    }

    // Delete the relationship
    await env.DB.prepare(
      'DELETE FROM ep_tracks WHERE ep_id = ? AND track_id = ?'
    ).bind(epId, trackId).run();

    // Optional: Reorder remaining tracks
    const remaining = await env.DB.prepare(
      'SELECT track_id FROM ep_tracks WHERE ep_id = ? ORDER BY track_number'
    ).bind(epId).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await env.DB.prepare(
        'UPDATE ep_tracks SET track_number = ? WHERE ep_id = ? AND track_id = ?'
      ).bind(i + 1, epId, remaining.results[i].track_id).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Track removed from EP successfully'
    }), { headers });

  } catch (error) {
    console.error('❌ Error removing track:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { status: 500, headers });
  }
}