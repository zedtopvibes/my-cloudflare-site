export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // GET - List all compilations
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
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
          c.updated_at,
          (SELECT COUNT(*) FROM compilation_items WHERE compilation_id = c.id) as item_count
        FROM compilations c
        WHERE c.deleted_at IS NULL
        ORDER BY c.created_at DESC
      `).all();
      
      return new Response(JSON.stringify(results), { headers });
      
    } catch (error) {
      console.error('Error fetching compilations:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new compilation
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      
      if (!data.title || !data.type) {
        return new Response(JSON.stringify({ 
          error: 'Title and type are required' 
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Generate base slug from title
      const baseSlug = data.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Generate unique slug
      const slug = await generateUniqueSlug(env.DB, baseSlug);
      
      const result = await env.DB.prepare(`
        INSERT INTO compilations (
          title, description, type, slug, cover_url, is_featured, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        data.title,
        data.description || null,
        data.type,
        slug,
        data.cover_url || null,
        data.is_featured ? 1 : 0,
        data.status || 'draft',
        data.created_by || 'Admin'
      ).run();
      
      const newCompilation = await env.DB.prepare(`
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
          c.updated_at,
          (SELECT COUNT(*) FROM compilation_items WHERE compilation_id = c.id) as item_count
        FROM compilations c
        WHERE c.id = ?
      `).bind(result.results[0].id).first();
      
      return new Response(JSON.stringify(newCompilation), { 
        status: 201,
        headers 
      });
      
    } catch (error) {
      console.error('Error creating compilation:', error);
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