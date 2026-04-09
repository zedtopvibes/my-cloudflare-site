export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // PUT - Update section (toggle visibility)
  if (request.method === 'PUT') {
    try {
      const { is_visible } = await request.json();
      
      if (is_visible === undefined) {
        return new Response(JSON.stringify({ error: 'is_visible is required' }), { 
          status: 400, 
          headers 
        });
      }
      
      await env.DB.prepare(`
        UPDATE homepage_sections SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(is_visible ? 1 : 0, id).run();
      
      const updated = await env.DB.prepare(`
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
      `).bind(id).first();
      
      return new Response(JSON.stringify(updated), { headers });
      
    } catch (error) {
      console.error('Error updating homepage section:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove section
  if (request.method === 'DELETE') {
    try {
      await env.DB.prepare(`
        DELETE FROM homepage_sections WHERE id = ?
      `).bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), { headers });
      
    } catch (error) {
      console.error('Error deleting homepage section:', error);
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