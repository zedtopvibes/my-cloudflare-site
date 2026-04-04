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

  // Helper function to generate unique slug
  async function generateUniqueSlug(db, baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;
    let exists = true;
    
    while (exists) {
      let query = `SELECT id FROM compilations WHERE slug = ? AND deleted_at IS NULL`;
      const params = [slug];
      
      if (excludeId) {
        query += ` AND id != ?`;
        params.push(excludeId);
      }
      
      const existing = await db.prepare(query).bind(...params).first();
      
      if (!existing) {
        exists = false;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }
    
    return slug;
  }

  // GET - Fetch single compilation
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
      
      return new Response(JSON.stringify(compilation), { headers });
      
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
        
        // Generate new unique slug when title changes
        const baseSlug = updates.title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        const newSlug = await generateUniqueSlug(env.DB, baseSlug, id);
        fields.push('slug = ?');
        values.push(newSlug);
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
      
      // Check if has items
      const itemCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM compilation_items WHERE compilation_id = ?
      `).bind(id).first();
      
      if (itemCount.count > 0) {
        return new Response(JSON.stringify({ 
          error: `Cannot delete compilation with ${itemCount.count} item(s). Remove all items first.`
        }), { status: 400, headers });
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