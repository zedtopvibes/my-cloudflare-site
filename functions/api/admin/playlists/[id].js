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
      const { name, description } = await request.json();

      const existing = await env.DB.prepare(
        'SELECT * FROM playlists WHERE id = ?'
      ).bind(id).first();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
          status: 404, 
          headers 
        });
      }

      // Generate new slug if name changed
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
        SET name = ?, slug = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        name || existing.name,
        slug,
        description !== undefined ? description : existing.description,
        id
      ).run();

      const updated = await env.DB.prepare(
        'SELECT * FROM playlists WHERE id = ?'
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

  // DELETE - Delete playlist
  if (request.method === 'DELETE') {
    try {
      // This will cascade delete playlist_tracks if foreign key has CASCADE
      await env.DB.prepare(
        'DELETE FROM playlists WHERE id = ?'
      ).bind(id).run();

      return new Response(JSON.stringify({ success: true }), { headers });

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