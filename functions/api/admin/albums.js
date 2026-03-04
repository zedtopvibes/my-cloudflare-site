export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET - List all albums (if needed)
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT * FROM albums ORDER BY created_at DESC
      `).all();
      return new Response(JSON.stringify(results), { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new album
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      
      // Generate slug from title
      const slug = data.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await env.DB.prepare(`
        INSERT INTO albums (
          title, artist, description, release_date, genre, label, 
          is_featured, slug, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        data.title,
        data.artist,
        data.description || null,
        data.release_date || null,
        data.genre || null,
        data.label || null,
        data.is_featured || 0,
        slug
      ).run();

      const newAlbum = await env.DB.prepare(`
        SELECT * FROM albums WHERE id = ?
      `).bind(result.results[0].id).first();

      return new Response(JSON.stringify(newAlbum), { 
        status: 201,
        headers 
      });

    } catch (error) {
      console.error('Error creating album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Update album (handled in [id].js)
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}