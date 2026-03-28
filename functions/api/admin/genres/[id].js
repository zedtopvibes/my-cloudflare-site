export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // GET - Get genre details with stats
  if (request.method === 'GET') {
    try {
      // Get artists with this genre
      const artistsCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM artists 
        WHERE deleted_at IS NULL AND genre = ?
      `).bind(slug).first();
      
      // Get albums with this genre
      const albumsCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM albums 
        WHERE deleted_at IS NULL AND genre = ?
      `).bind(slug).first();
      
      // Get EPs with this genre
      const epsCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM eps 
        WHERE deleted_at IS NULL AND genre = ?
      `).bind(slug).first();
      
      // Get sample tracks with this genre
      const tracks = await env.DB.prepare(`
        SELECT id, title, slug FROM tracks 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
        LIMIT 10
      `).bind(slug).all();
      
      return new Response(JSON.stringify({
        name: slug,
        slug: slug,
        stats: {
          artists: artistsCount?.count || 0,
          albums: albumsCount?.count || 0,
          eps: epsCount?.count || 0,
          total: (artistsCount?.count || 0) + (albumsCount?.count || 0) + (epsCount?.count || 0)
        },
        sample_tracks: tracks.results || []
      }), { headers });
      
    } catch (error) {
      console.error('Error fetching genre:', error);
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