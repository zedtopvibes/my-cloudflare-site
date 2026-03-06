export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const { name, description } = await request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: 'Playlist name is required' }), { 
        status: 400, 
        headers 
      });
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');

    const result = await env.DB.prepare(`
      INSERT INTO playlists (name, slug, description, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id
    `).bind(name, slug, description || null).run();

    const newPlaylist = await env.DB.prepare(`
      SELECT * FROM playlists WHERE id = ?
    `).bind(result.results[0].id).first();

    return new Response(JSON.stringify(newPlaylist), { 
      status: 201, 
      headers 
    });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}