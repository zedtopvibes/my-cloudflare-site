export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET - Get compilation with items
  if (request.method === 'GET') {
    try {
      const compilation = await env.DB.prepare(`
        SELECT 
          c.id,
          c.title,
          c.description,
          c.type,
          c.slug,
          c.cover_url,
          c.is_featured,
          c.status,
          c.views,
          c.created_by,
          c.created_at,
          c.updated_at
        FROM compilations c
        WHERE c.id = ? AND c.deleted_at IS NULL
      `).bind(id).first();
      
      if (!compilation) {
        return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      // Get items based on type
      const items = await env.DB.prepare(`
        SELECT 
          ci.id as item_relation_id,
          ci.item_id,
          ci.display_order,
          ci.added_at
        FROM compilation_items ci
        WHERE ci.compilation_id = ?
        ORDER BY ci.display_order ASC
      `).bind(id).all();
      
      // Fetch full item details based on compilation type
      let itemsWithDetails = [];
      
      if (compilation.type === 'albums') {
        const albumIds = items.results.map(i => i.item_id).join(',');
        if (albumIds) {
          const albumDetails = await env.DB.prepare(`
            SELECT 
              a.id, a.title, a.cover_url, a.release_date,
              ar.name as artist_name
            FROM albums a
            LEFT JOIN artists ar ON a.artist_id = ar.id
            WHERE a.id IN (${albumIds}) AND a.deleted_at IS NULL
          `).all();
          
          itemsWithDetails = items.results.map(item => ({
            ...item,
            item: albumDetails.results.find(a => a.id === item.item_id)
          }));
        }
      } else if (compilation.type === 'eps') {
        const epIds = items.results.map(i => i.item_id).join(',');
        if (epIds) {
          const epDetails = await env.DB.prepare(`
            SELECT 
              e.id, e.title, e.cover_url, e.release_date,
              ar.name as artist_name
            FROM eps e
            LEFT JOIN artists ar ON e.artist_id = ar.id
            WHERE e.id IN (${epIds}) AND e.deleted_at IS NULL
          `).all();
          
          itemsWithDetails = items.results.map(item => ({
            ...item,
            item: epDetails.results.find(e => e.id === item.item_id)
          }));
        }
      } else if (compilation.type === 'artists') {
        const artistIds = items.results.map(i => i.item_id).join(',');
        if (artistIds) {
          const artistDetails = await env.DB.prepare(`
            SELECT id, name, image_url, country, slug
            FROM artists
            WHERE id IN (${artistIds}) AND deleted_at IS NULL
          `).all();
          
          itemsWithDetails = items.results.map(item => ({
            ...item,
            item: artistDetails.results.find(a => a.id === item.item_id)
          }));
        }
      } else if (compilation.type === 'playlists') {
        const playlistIds = items.results.map(i => i.item_id).join(',');
        if (playlistIds) {
          const playlistDetails = await env.DB.prepare(`
            SELECT id, name, cover_url, created_by, views
            FROM playlists
            WHERE id IN (${playlistIds}) AND deleted_at IS NULL
          `).all();
          
          itemsWithDetails = items.results.map(item => ({
            ...item,
            item: playlistDetails.results.find(p => p.id === item.item_id)
          }));
        }
      }
      
      return new Response(JSON.stringify({
        ...compilation,
        items: itemsWithDetails
      }), { headers });
      
    } catch (error) {
      console.error('Error fetching compilation:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Update compilation
  if (request.method === 'PUT') {
    try {
      const updates = await request.json();
      
      const existing = await env.DB.prepare(
        'SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();
      
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
        
        // Update slug when title changes
        const slug = updates.title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+|-+$/g, '');
        fields.push('slug = ?');
        values.push(slug);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.cover_url !== undefined) {
        fields.push('cover_url = ?');
        values.push(updates.cover_url);
      }
      if (updates.is_featured !== undefined) {
        fields.push('is_featured = ?');
        values.push(updates.is_featured ? 1 : 0);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      
      if (fields.length > 0) {
        values.push(id);
        const query = `UPDATE compilations SET ${fields.join(', ')} WHERE id = ?`;
        await env.DB.prepare(query).bind(...values).run();
      }
      
      const updated = await env.DB.prepare(`
        SELECT 
          id, title, description, type, slug, cover_url,
          is_featured, status, views, created_by, created_at, updated_at
        FROM compilations
        WHERE id = ?
      `).bind(id).first();
      
      return new Response(JSON.stringify(updated), { headers });
      
    } catch (error) {
      console.error('Error updating compilation:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Soft delete compilation
  if (request.method === 'DELETE') {
    try {
      const existing = await env.DB.prepare(
        'SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL'
      ).bind(id).first();
      
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      await env.DB.prepare(`
        UPDATE compilations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(id).run();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Compilation moved to trash'
      }), { headers });
      
    } catch (error) {
      console.error('Error deleting compilation:', error);
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