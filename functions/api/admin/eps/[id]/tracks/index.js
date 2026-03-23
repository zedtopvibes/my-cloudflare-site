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
    const epId = params.id;
    const { track_id } = await request.json();

    // Check if EP exists
    const ep = await env.DB.prepare(
      'SELECT id, title FROM eps WHERE id = ?'
    ).bind(epId).first();

    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found' }), { 
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

    // IMPORTANT: Check if track is already in ANY EP
    const existingInAnyEP = await env.DB.prepare(`
      SELECT et.ep_id, e.title as ep_title 
      FROM ep_tracks et
      JOIN eps e ON et.ep_id = e.id
      WHERE et.track_id = ?
    `).bind(track_id).first();

    if (existingInAnyEP) {
      return new Response(JSON.stringify({ 
        error: `Track already belongs to EP: ${existingInAnyEP.ep_title}`,
        ep_id: existingInAnyEP.ep_id
      }), { status: 400, headers });
    }

    // Get next position
    const maxPos = await env.DB.prepare(`
      SELECT MAX(track_number) as max_pos 
      FROM ep_tracks 
      WHERE ep_id = ?
    `).bind(epId).first();

    const position = (maxPos?.max_pos || 0) + 1;

    // Add track to EP
    await env.DB.prepare(`
      INSERT INTO ep_tracks (ep_id, track_id, track_number)
      VALUES (?, ?, ?)
    `).bind(epId, track_id, position).run();

    return new Response(JSON.stringify({ 
      success: true, 
      position,
      message: 'Track added to EP'
    }), { headers });

  } catch (error) {
    console.error('Error adding track to EP:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}