export async function onRequest(context) {
  try {
    const { request, env, params } = context;
    const { type, id } = params;
    
    // Only allow DELETE requests
    if (request.method !== 'DELETE') {
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

    // Define table configurations with correct column names
    const config = {
      tracks: {
        table: 'tracks',
        idField: 'id',
        nameField: 'title',
        getFileUrls: async (db, id) => {
          const stmt = db.prepare('SELECT r2_key, artwork_url FROM tracks WHERE id = ?');
          const { results } = await stmt.bind(id).all();
          return results[0] || null;
        }
      },
      albums: {
        table: 'albums',
        idField: 'id',
        nameField: 'title',
        getFileUrls: async (db, id) => {
          const stmt = db.prepare('SELECT cover_url FROM albums WHERE id = ?');
          const { results } = await stmt.bind(id).all();
          return results[0] || null;
        }
      },
      eps: {
        table: 'eps',
        idField: 'id',
        nameField: 'title',
        getFileUrls: async (db, id) => {
          const stmt = db.prepare('SELECT cover_url FROM eps WHERE id = ?');
          const { results } = await stmt.bind(id).all();
          return results[0] || null;
        }
      },
      artists: {
        table: 'artists',
        idField: 'id',
        nameField: 'name',
        getFileUrls: async (db, id) => {
          const stmt = db.prepare('SELECT image_url FROM artists WHERE id = ?');
          const { results } = await stmt.bind(id).all();
          return results[0] || null;
        }
      },
      playlists: {
        table: 'playlists',
        idField: 'id',
        nameField: 'name',
        getFileUrls: async (db, id) => {
          const stmt = db.prepare('SELECT cover_url FROM playlists WHERE id = ?');
          const { results } = await stmt.bind(id).all();
          return results[0] || null;
        }
      }
    };

    if (!config[type]) {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { table, idField, getFileUrls } = config[type];

    // Get file URLs before deletion
    const fileUrls = await getFileUrls(env.DB, id);
    
    if (!fileUrls) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from database
    const deleteStmt = env.DB.prepare(`DELETE FROM ${table} WHERE ${idField} = ?`);
    const result = await deleteStmt.bind(id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete associated files from R2
    const deletePromises = [];
    
    // Helper function to extract key from URL
    const getKeyFromUrl = (url) => {
      if (!url) return null;
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        return pathname.startsWith('/') ? pathname.slice(1) : pathname;
      } catch (e) {
        return null;
      }
    };

    // Track files - using r2_key for tracks
    if (type === 'tracks' && fileUrls.r2_key) {
      deletePromises.push(env.R2.delete(fileUrls.r2_key));
    }
    
    // Cover/artwork files
    const fileFields = {
      tracks: ['artwork_url'],
      albums: ['cover_url'],
      eps: ['cover_url'],
      artists: ['image_url'],
      playlists: ['cover_url']
    };
    
    const fields = fileFields[type] || [];
    fields.forEach(field => {
      if (fileUrls[field]) {
        const key = getKeyFromUrl(fileUrls[field]);
        if (key) deletePromises.push(env.R2.delete(key));
      }
    });

    // Execute file deletions in parallel (don't wait for success to avoid blocking)
    Promise.allSettled(deletePromises).catch(console.error);

    return new Response(JSON.stringify({ success: true }), {
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