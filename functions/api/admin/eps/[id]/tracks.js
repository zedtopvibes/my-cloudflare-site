export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const epId = params.id;

  // POST - Add track to EP
  if (request.method === 'POST') {
    try {
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

      // ===== CHECK: Track already in an Album? =====
      const existingInAlbum = await env.DB.prepare(`
        SELECT at.album_id, a.title as album_title 
        FROM album_tracks at
        JOIN albums a ON at.album_id = a.id
        WHERE at.track_id = ?
      `).bind(track_id).first();

      if (existingInAlbum) {
        return new Response(JSON.stringify({ 
          error: `❌ Track already belongs to Album: "${existingInAlbum.album_title}". Cannot add to EP.`,
          album_id: existingInAlbum.album_id,
          conflict_type: 'album'
        }), { status: 400, headers });
      }

      // Check if track is already in ANY EP
      const existingInEP = await env.DB.prepare(`
        SELECT et.ep_id, e.title as ep_title 
        FROM ep_tracks et
        JOIN eps e ON et.ep_id = e.id
        WHERE et.track_id = ?
      `).bind(track_id).first();

      if (existingInEP) {
        return new Response(JSON.stringify({ 
          error: `Track already belongs to EP: "${existingInEP.ep_title}"`,
          ep_id: existingInEP.ep_id
        }), { status: 400, headers });
      }

      // Get next track number
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
        message: 'Track added to EP successfully'
      }), { headers });

    } catch (error) {
      console.error('Error adding track to EP:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove track from EP
  if (request.method === 'DELETE') {
    try {
      // Get track_id from URL path
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const trackId = pathParts[pathParts.length - 1];

      // Check if relationship exists
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

      // Reorder remaining tracks
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
      console.error('Error removing track from EP:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}