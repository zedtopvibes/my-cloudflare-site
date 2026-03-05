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
      const { name, country, bio, is_featured, is_zambian_legend } = await request.json();
      
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

      // Update artist - REMOVED updated_at
      await env.DB.prepare(`
        UPDATE artists 
        SET name = ?, slug = ?, country = ?, bio = ?, 
            is_featured = ?, is_zambian_legend = ?
        WHERE id = ?
      `).bind(
        name || existing.name,
        slug,
        country !== undefined ? country : existing.country,
        bio !== undefined ? bio : existing.bio,
        is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
        is_zambian_legend !== undefined ? (is_zambian_legend ? 1 : 0) : existing.is_zambian_legend,
        id
      ).run();

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
      await env.DB.prepare(
        'DELETE FROM artists WHERE id = ?'
      ).bind(id).run();

      return new Response(JSON.stringify({ success: true }), { headers });

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