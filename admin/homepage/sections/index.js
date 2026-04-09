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

  // GET - List all homepage sections
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          hs.id,
          hs.title,
          hs.source_type,
          hs.source_id,
          hs.display_order,
          hs.is_visible,
          hs.created_at,
          hs.updated_at,
          CASE 
            WHEN hs.source_type = 'playlist' THEN p.name
            WHEN hs.source_type = 'compilation' THEN c.title
          END as source_title,
          CASE 
            WHEN hs.source_type = 'playlist' THEN p.slug
            WHEN hs.source_type = 'compilation' THEN c.slug
          END as source_slug,
          CASE 
            WHEN hs.source_type = 'playlist' THEN 'playlist'
            WHEN hs.source_type = 'compilation' THEN c.type
          END as source_type_display,
          CASE 
            WHEN hs.source_type = 'playlist' THEN (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id)
            WHEN hs.source_type = 'compilation' THEN (SELECT COUNT(*) FROM compilation_items WHERE compilation_id = c.id)
          END as item_count
        FROM homepage_sections hs
        LEFT JOIN playlists p ON hs.source_type = 'playlist' AND hs.source_id = p.id AND p.deleted_at IS NULL
        LEFT JOIN compilations c ON hs.source_type = 'compilation' AND hs.source_id = c.id AND c.deleted_at IS NULL
        WHERE (p.id IS NOT NULL OR c.id IS NOT NULL)
        ORDER BY hs.display_order ASC
      `).all();
      
      return new Response(JSON.stringify(results), { headers });
      
    } catch (error) {
      console.error('Error fetching homepage sections:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Add new section
  if (request.method === 'POST') {
    try {
      const { title, source_type, source_id } = await request.json();
      
      if (!title || !source_type || !source_id) {
        return new Response(JSON.stringify({ error: 'Title, source_type, and source_id are required' }), { 
          status: 400, 
          headers 
        });
      }
      
      // Verify source exists
      if (source_type === 'playlist') {
        const playlist = await env.DB.prepare(`
          SELECT id FROM playlists WHERE id = ? AND deleted_at IS NULL
        `).bind(source_id).first();
        if (!playlist) {
          return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
            status: 404, 
            headers 
          });
        }
      } else if (source_type === 'compilation') {
        const compilation = await env.DB.prepare(`
          SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL
        `).bind(source_id).first();
        if (!compilation) {
          return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
            status: 404, 
            headers 
          });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Invalid source_type. Must be "playlist" or "compilation"' }), { 
          status: 400, 
          headers 
        });
      }
      
      // Get max display order
      const maxOrder = await env.DB.prepare(`
        SELECT MAX(display_order) as max_order FROM homepage_sections
      `).first();
      
      const displayOrder = (maxOrder?.max_order || 0) + 1;
      
      const result = await env.DB.prepare(`
        INSERT INTO homepage_sections (title, source_type, source_id, display_order)
        VALUES (?, ?, ?, ?)
        RETURNING id
      `).bind(title, source_type, source_id, displayOrder).run();
      
      const newSection = await env.DB.prepare(`
        SELECT 
          hs.id,
          hs.title,
          hs.source_type,
          hs.source_id,
          hs.display_order,
          hs.is_visible,
          hs.created_at,
          hs.updated_at,
          CASE 
            WHEN hs.source_type = 'playlist' THEN p.name
            WHEN hs.source_type = 'compilation' THEN c.title
          END as source_title,
          CASE 
            WHEN hs.source_type = 'playlist' THEN p.slug
            WHEN hs.source_type = 'compilation' THEN c.slug
          END as source_slug,
          CASE 
            WHEN hs.source_type = 'playlist' THEN 'playlist'
            WHEN hs.source_type = 'compilation' THEN c.type
          END as source_type_display,
          CASE 
            WHEN hs.source_type = 'playlist' THEN (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id)
            WHEN hs.source_type = 'compilation' THEN (SELECT COUNT(*) FROM compilation_items WHERE compilation_id = c.id)
          END as item_count
        FROM homepage_sections hs
        LEFT JOIN playlists p ON hs.source_type = 'playlist' AND hs.source_id = p.id
        LEFT JOIN compilations c ON hs.source_type = 'compilation' AND hs.source_id = c.id
        WHERE hs.id = ?
      `).bind(result.results[0].id).first();
      
      return new Response(JSON.stringify(newSection), { 
        status: 201, 
        headers 
      });
      
    } catch (error) {
      console.error('Error adding homepage section:', error);
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