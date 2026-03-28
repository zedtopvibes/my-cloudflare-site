export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET - List all artists (ADMIN - shows all including drafts)
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT id, name, slug, image_url, bio, country, genre, is_featured, is_zambian_legend, status, created_at
        FROM artists 
        WHERE deleted_at IS NULL 
        ORDER BY name ASC
      `).all();
      
      return new Response(JSON.stringify(results), { headers });
      
    } catch (error) {
      console.error('Error fetching artists:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new artist with status support
  if (request.method === 'POST') {
    try {
      const { name, country, genre, bio, is_featured, is_zambian_legend, status } = await request.json();
      
      if (!name) {
        return new Response(JSON.stringify({ error: 'Artist name is required' }), { 
          status: 400, 
          headers 
        });
      }

      // Get status from request (default to draft)
      const artistStatus = status || 'draft'; // 'draft' or 'published'

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if artist already exists
      const existing = await env.DB.prepare(
        'SELECT id FROM artists WHERE name = ? OR slug = ?'
      ).bind(name, slug).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: 'Artist with this name already exists' 
        }), { status: 400, headers });
      }

      // Insert new artist with status and genre
      const result = await env.DB.prepare(`
        INSERT INTO artists (name, slug, country, genre, bio, is_featured, is_zambian_legend, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        name, 
        slug, 
        country || null,
        genre || null,
        bio || null, 
        is_featured ? 1 : 0, 
        is_zambian_legend ? 1 : 0,
        artistStatus
      ).run();

      const newArtist = await env.DB.prepare(`
        SELECT id, name, slug, image_url, bio, country, genre, is_featured, is_zambian_legend, status, created_at
        FROM artists WHERE id = ?
      `).bind(result.results[0].id).first();

      return new Response(JSON.stringify(newArtist), { 
        status: 201, 
        headers 
      });

    } catch (error) {
      console.error('Error creating artist:', error);
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