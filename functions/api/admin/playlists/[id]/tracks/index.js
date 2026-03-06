export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const playlistId = params.id;
    const { track_id } = await request.json();

    // Check if playlist exists
    const playlist = await env.DB.prepare(
      'SELECT id FROM playlists WHERE id = ?'
    ).bind(playlistId).first();

    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }

    // Check if track exists
    const track = await env.DB.prepare(
      'SELECT id FROM tracks WHERE id = ?'
    ).bind(track_id).first();

    if (!track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), { 
        status: 404, 
        headers 
      });
    }

    // Check if track already in playlist
    const existing = await env.DB.prepare(
      'SELECT * FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?'
    ).bind(playlistId, track_id).first();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Track already in playlist' }), { 
        status: 400, 
        headers 
      });
    }

    // Get next position
    const maxPos = await env.DB.prepare(`
      SELECT MAX(position) as max_pos 
      FROM playlist_tracks 
      WHERE playlist_id = ?
    `).bind(playlistId).first();

    const position = (maxPos?.max_pos || 0) + 1;

    // Add track to playlist
    await env.DB.prepare(`
      INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(playlistId, track_id, position).run();

    // Update playlist stats (increment track count conceptually)
    // Note: You don't have track_count column, so we just return success

    return new Response(JSON.stringify({ 
      success: true, 
      position,
      message: 'Track added to playlist'
    }), { headers });

  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}