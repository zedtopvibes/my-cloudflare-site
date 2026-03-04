export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow DELETE
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed'
    }), { status: 405, headers });
  }

  try {
    const albumId = params.id;
    const trackId = params.trackId;
    
    console.log('Removing track:', { albumId, trackId });

    // Check if the relationship exists
    const exists = await env.DB.prepare(`
      SELECT * FROM album_tracks 
      WHERE album_id = ? AND track_id = ?
    `).bind(albumId, trackId).first();
    
    if (!exists) {
      return new Response(JSON.stringify({ 
        error: 'Track not found in this album'
      }), { status: 404, headers });
    }

    // Delete the relationship
    await env.DB.prepare(`
      DELETE FROM album_tracks 
      WHERE album_id = ? AND track_id = ?
    `).bind(albumId, trackId).run();

    // Reorder remaining tracks (optional)
    const remaining = await env.DB.prepare(`
      SELECT track_id FROM album_tracks 
      WHERE album_id = ? 
      ORDER BY track_number
    `).bind(albumId).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await env.DB.prepare(`
        UPDATE album_tracks 
        SET track_number = ? 
        WHERE album_id = ? AND track_id = ?
      `).bind(i + 1, albumId, remaining.results[i].track_id).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Track removed successfully'
    }), { headers });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { status: 500, headers });
  }
}