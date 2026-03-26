export async function onRequest(context) {
  try {
    const { request, env } = context;
    
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin authentication (implement your auth logic)
    // const isAdmin = await checkAdminAuth(request, env);
    // if (!isAdmin) {
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }

    const queries = {
      tracks: `SELECT id, title, artist_id, duration, artwork_url, deleted_at FROM tracks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      albums: `SELECT id, title, artist_id, cover_url, release_date, deleted_at FROM albums WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      eps: `SELECT id, title, artist_id, cover_url, release_date, deleted_at FROM eps WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      artists: `SELECT id, name, bio, image_url, deleted_at FROM artists WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      playlists: `SELECT id, name, description, cover_url, created_by, deleted_at FROM playlists WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    };

    const results = {};
    
    for (const [table, query] of Object.entries(queries)) {
      const stmt = env.DB.prepare(query);
      const { results: rows } = await stmt.all();
      results[table] = rows;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}