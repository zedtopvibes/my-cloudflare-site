export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const playlistId = params.id;
    const trackId = params.trackId;

    // Check if relationship exists
    const exists = await env.DB.prepare(
      'SELECT * FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?'
    ).bind(playlistId, trackId).first();

    if (!exists) {
      return new Response(JSON.stringify({ error: 'Track not found in playlist' }), { 
        status: 404, 
        headers 
      });
    }

    // Remove track
    await env.DB.prepare(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?'
    ).bind(playlistId, trackId).run();

    // Reorder remaining tracks
    const remaining = await env.DB.prepare(`
      SELECT track_id FROM playlist_tracks 
      WHERE playlist_id = ? 
      ORDER BY position
    `).bind(playlistId).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await env.DB.prepare(`
        UPDATE playlist_tracks 
        SET position = ? 
        WHERE playlist_id = ? AND track_id = ?
      `).bind(i + 1, playlistId, remaining.results[i].track_id).run();
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (error) {
    console.error('Error removing track from playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}