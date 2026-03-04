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

  const albumId = params.id;

  // POST - Add track to album
  if (request.method === 'POST') {
    try {
      const { track_id } = await request.json();
      
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
        }), { 
          status: 400, 
          headers 
        });
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

      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error adding track to album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove track from album (FIXED)
  if (request.method === 'DELETE') {
    try {
      // Use params.trackId - it's automatically parsed from the URL pattern [id]/tracks/[trackId]
      const trackId = params.trackId;
      
      console.log(`Removing track ${trackId} from album ${albumId}`);

      // Check if the relationship exists
      const exists = await env.DB.prepare(`
        SELECT * FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumId, trackId).first();

      if (!exists) {
        return new Response(JSON.stringify({ 
          error: 'Track not found in this album' 
        }), { 
          status: 404, 
          headers 
        });
      }

      // Delete the relationship
      await env.DB.prepare(`
        DELETE FROM album_tracks 
        WHERE album_id = ? AND track_id = ?
      `).bind(albumId, trackId).run();

      // Reorder remaining tracks to keep track numbers sequential
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
      console.error('Error removing track from album:', error);
      return new Response(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }), { 
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