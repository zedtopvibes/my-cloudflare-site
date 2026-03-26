export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const { type } = params;
    
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin authentication
    // const isAdmin = await checkAdminAuth(request, env);
    // if (!isAdmin) {
    //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    //     status: 401,
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }

    const queries = {
      tracks: `SELECT id, title, artist_id, album_id, duration, file_url, cover_url, deleted_at FROM tracks WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      albums: `SELECT id, title, artist_id, cover_url, release_date, type, deleted_at FROM albums WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      eps: `SELECT id, title, artist_id, cover_url, release_date, deleted_at FROM eps WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      artists: `SELECT id, name, bio, avatar_url, cover_url, deleted_at FROM artists WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
      playlists: `SELECT id, title, description, cover_url, user_id, is_public, deleted_at FROM playlists WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    };

    if (!queries[type]) {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stmt = env.DB.prepare(queries[type]);
    const { results } = await stmt.all();

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