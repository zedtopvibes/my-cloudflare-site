export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // ✅ GET - List all playlists (for admin panel)
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          p.id,
          p.name,
          p.description,
          p.cover_url,
          p.cover_emoji,
          p.slug,
          p.is_featured,
          p.created_by,
          p.created_at,
          p.updated_at,
          p.status,
          (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count,
          p.plays,
          p.downloads,
          p.views
        FROM playlists p
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `).all();
      
      return new Response(JSON.stringify(results), { headers });
    } catch (error) {
      console.error('Error fetching playlists:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new playlist (your existing code)
  if (request.method === 'POST') {
    try {
      const { name, description, is_featured, cover_emoji, status } = await request.json();

      if (!name) {
        return new Response(JSON.stringify({ error: 'Playlist name is required' }), { 
          status: 400, 
          headers 
        });
      }

      const playlistStatus = status || 'draft';

      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await env.DB.prepare(`
        INSERT INTO playlists (
          name, slug, description, cover_emoji, is_featured, 
          created_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        name, 
        slug, 
        description || null, 
        cover_emoji || '📋', 
        is_featured ? 1 : 0,
        'Admin',
        playlistStatus
      ).run();

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

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}