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
      const { name, country, bio, is_featured, is_zambian_legend, image_url } = await request.json();
      
      // Check if artist exists
      const existing = await env.DB.prepare(
        'SELECT * FROM artists WHERE id = ?'
      ).bind(id).first();

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Artist not found' }), { 
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

      // Build update query dynamically
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
        'SELECT * FROM artists WHERE id = ?'
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

  // DELETE - Delete artist
  if (request.method === 'DELETE') {
    try {
      // First, check if artist is referenced in track_artists
      const trackArtistRelations = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM track_artists WHERE artist_id = ?
      `).bind(id).first();

      if (trackArtistRelations.count > 0) {
        // Option 1: Delete the relationships
        await env.DB.prepare(`
          DELETE FROM track_artists WHERE artist_id = ?
        `).bind(id).run();
        
        // Option 2: Or return error if you don't want to allow deletion
        // return new Response(JSON.stringify({ 
        //   error: 'Cannot delete artist with existing track associations. Remove artist from tracks first.' 
        // }), { status: 400, headers });
      }

      // Check if artist is referenced in albums
      const albumRelations = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM albums WHERE artist_id = ?
      `).bind(id).first();

      if (albumRelations.count > 0) {
        await env.DB.prepare(`
          UPDATE albums SET artist_id = NULL WHERE artist_id = ?
        `).bind(id).run();
      }

      // Check if artist is referenced in eps
      const epRelations = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM eps WHERE artist_id = ?
      `).bind(id).first();

      if (epRelations.count > 0) {
        await env.DB.prepare(`
          UPDATE eps SET artist_id = NULL WHERE artist_id = ?
        `).bind(id).run();
      }

      // Finally, delete the artist
      await env.DB.prepare(
        'DELETE FROM artists WHERE id = ?'
      ).bind(id).run();

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Artist deleted successfully'
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
