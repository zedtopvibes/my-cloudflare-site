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

  // PUT - Update artist
  if (request.method === 'PUT') {
    try {
      const { name, country, bio, is_featured, is_zambian_legend, image_url, status } = await request.json();
      
      const existing = await env.DB.prepare(
        'SELECT * FROM artists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), { 
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

      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
        updates.push('slug = ?');
        values.push(slug);
      }
      if (country !== undefined) {
        updates.push('country = ?');
        values.push(country);
      }
      if (bio !== undefined) {
        updates.push('bio = ?');
        values.push(bio);
      }
      if (is_featured !== undefined) {
        updates.push('is_featured = ?');
        values.push(is_featured ? 1 : 0);
      }
      if (is_zambian_legend !== undefined) {
        updates.push('is_zambian_legend = ?');
        values.push(is_zambian_legend ? 1 : 0);
      }
      if (image_url !== undefined) {
        updates.push('image_url = ?');
        values.push(image_url);
      }
      // NEW: Add status field
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), { 
          status: 400, 
          headers 
        });
      }

      values.push(id);
      const query = `UPDATE artists SET ${updates.join(', ')} WHERE id = ?`;
      await env.DB.prepare(query).bind(...values).run();

      const updated = await env.DB.prepare(
        'SELECT * FROM artists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      return new Response(JSON.stringify(updated), { headers });

    } catch (error) {
      console.error('Error updating artist:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Soft delete artist
  if (request.method === 'DELETE') {
    try {
      const artist = await env.DB.prepare(
        'SELECT id FROM artists WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();

      if (!artist) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), { 
          status: 404, 
          headers 
        });
      }

      // Check if artist has tracks
      const trackCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM track_artists WHERE artist_id = ?
      `).bind(id).first();

      if (trackCount.count > 0) {
        return new Response(JSON.stringify({ 
          error: `Cannot delete artist with ${trackCount.count} track(s). Remove all tracks first or reassign to another artist.`
        }), { status: 400, headers });
      }

      // Soft delete
      await env.DB.prepare(`
        UPDATE artists 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(id).run();

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Artist moved to trash'
      }), { headers });

    } catch (error) {
      console.error('Error deleting artist:', error);
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