export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const id = params.id;

  // PUT - Update playlist
  if (request.method === 'PUT') {
    try {
      const { name, description, is_featured, cover_emoji } = await request.json();

      const existing = await env.DB.prepare(
        'SELECT * FROM playlists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
          status: 404, 
          headers 
        });
      }

      let slug = existing.slug;
      if (name && name !== existing.name) {
        slug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      await env.DB.prepare(`
        UPDATE playlists 
        SET name = ?, slug = ?, description = ?, 
            is_featured = ?, cover_emoji = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        name || existing.name,
        slug,
        description !== undefined ? description : existing.description,
        is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
        cover_emoji || existing.cover_emoji,
        id
      ).run();

      const updated = await env.DB.prepare(
        'SELECT * FROM playlists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      return new Response(JSON.stringify(updated), { headers });

    } catch (error) {
      console.error('Error updating playlist:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Soft delete playlist
  if (request.method === 'DELETE') {
    try {
      const playlist = await env.DB.prepare(
        'SELECT id FROM playlists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      if (!playlist) {
        return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
          status: 404, 
          headers 
        });
      }

      // Check if playlist has tracks
      const trackCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM playlist_tracks WHERE playlist_id = ?
      `).bind(id).first();

      if (trackCount.count > 0) {
        return new Response(JSON.stringify({ 
          error: `Cannot delete playlist with ${trackCount.count} track(s). Remove all tracks first.`
        }), { status: 400, headers });
      }

      await env.DB.prepare(`
        UPDATE playlists 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(id).run();

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Playlist moved to trash'
      }), { headers });

    } catch (error) {
      console.error('Error deleting playlist:', error);
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