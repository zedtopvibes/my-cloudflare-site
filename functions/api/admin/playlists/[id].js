export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const id = params.id;

  // ✅ NEW: GET - Fetch single playlist for editing
  if (request.method === 'GET') {
    try {
      const playlist = await env.DB.prepare(`
        SELECT * FROM playlists WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first();
      
      if (!playlist) {
        return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      return new Response(JSON.stringify(playlist), { headers });
      
    } catch (error) {
      console.error('Error fetching playlist:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Update playlist
  if (request.method === 'PUT') {
    try {
      const { name, description, is_featured, cover_emoji, status } = await request.json();

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

      // Build dynamic UPDATE query with status
      const updates = [];
      const values = [];

      updates.push('name = ?');
      values.push(name || existing.name);
      
      updates.push('slug = ?');
      values.push(slug);
      
      updates.push('description = ?');
      values.push(description !== undefined ? description : existing.description);
      
      updates.push('is_featured = ?');
      values.push(is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured);
      
      updates.push('cover_emoji = ?');
      values.push(cover_emoji || existing.cover_emoji);
      
      // Add status field
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      values.push(id);
      const query = `UPDATE playlists SET ${updates.join(', ')} WHERE id = ?`;
      await env.DB.prepare(query).bind(...values).run();

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