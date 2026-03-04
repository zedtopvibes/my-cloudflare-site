export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      allowed: ['POST', 'OPTIONS']
    }), { status: 405, headers });
  }

  try {
    const albumId = params.id;
    const { track_id } = await request.json();
    
    console.log('➕ Adding track:', { albumId, track_id });

    // Check if track already exists in ANY album
    const existing = await env.DB.prepare(`
      SELECT a.title as album_title, at.album_id 
      FROM album_tracks at
      JOIN albums a ON at.album_id = a.id
      WHERE at.track_id = ?
    `).bind(track_id).first();

    if (existing) {
      return new Response(JSON.stringify({ 
        error: `Track is already in album: ${existing.album_title}` 
      }), { status: 400, headers });
    }
    
    // Get current max track number
    const maxTrack = await env.DB.prepare(`
      SELECT MAX(track_number) as max_num 
      FROM album_tracks 
      WHERE album_id = ?
    `).bind(albumId).first();
    
    const trackNumber = (maxTrack?.max_num || 0) + 1;

    await env.DB.prepare(`
      INSERT INTO album_tracks (album_id, track_id, track_number)
      VALUES (?, ?, ?)
    `).bind(albumId, track_id, trackNumber).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Track added successfully'
    }), { headers });

  } catch (error) {
    console.error('❌ Error adding track:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { status: 500, headers });
  }
}