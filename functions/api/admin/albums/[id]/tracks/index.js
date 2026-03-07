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
    const albumId = params.id;
    const { track_id } = await request.json();

    // Check if album exists
    const album = await env.DB.prepare(
      'SELECT id, title FROM albums WHERE id = ?'
    ).bind(albumId).first();

    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
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

    // IMPORTANT: Check if track is already in ANY album
    const existingInAnyAlbum = await env.DB.prepare(`
      SELECT at.album_id, a.title as album_title 
      FROM album_tracks at
      JOIN albums a ON at.album_id = a.id
      WHERE at.track_id = ?
    `).bind(track_id).first();

    if (existingInAnyAlbum) {
      return new Response(JSON.stringify({ 
        error: `Track already belongs to album: ${existingInAnyAlbum.album_title}`,
        album_id: existingInAnyAlbum.album_id
      }), { status: 400, headers });
    }

    // Get next position
    const maxPos = await env.DB.prepare(`
      SELECT MAX(track_number) as max_pos 
      FROM album_tracks 
      WHERE album_id = ?
    `).bind(albumId).first();

    const position = (maxPos?.max_pos || 0) + 1;

    // Add track to album
    await env.DB.prepare(`
      INSERT INTO album_tracks (album_id, track_id, track_number)
      VALUES (?, ?, ?)
    `).bind(albumId, track_id, position).run();

    return new Response(JSON.stringify({ 
      success: true, 
      position,
      message: 'Track added to album'
    }), { headers });

  } catch (error) {
    console.error('Error adding track to album:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}