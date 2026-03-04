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

  // GET - List all artists
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT * FROM artists ORDER BY name ASC
      `).all();
      
      return new Response(JSON.stringify(results), { headers });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new artist
  if (request.method === 'POST') {
    try {
      const { name, country, bio, is_featured, is_zambian_legend } = await request.json();
      
      if (!name) {
        return new Response(JSON.stringify({ error: 'Artist name is required' }), { 
          status: 400, 
          headers 
        });
      }

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

      // Insert new artist
      const result = await env.DB.prepare(`
        INSERT INTO artists (name, slug, country, bio, is_featured, is_zambian_legend)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING id
      `).bind(
        name, 
        slug, 
        country || null, 
        bio || null, 
        is_featured ? 1 : 0, 
        is_zambian_legend ? 1 : 0
      ).run();

      const newArtist = await env.DB.prepare(
        'SELECT * FROM artists WHERE id = ?'
      ).bind(result.results[0].id).first();

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