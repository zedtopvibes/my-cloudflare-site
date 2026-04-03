export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.slug;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // Get compilation
    const compilation = await env.DB.prepare(`
      SELECT 
        c.id,
        c.title,
        c.description,
        c.type,
        c.slug,
        c.cover_url,
        c.is_featured,
        c.views,
        c.created_by,
        c.created_at
      FROM compilations c
      WHERE c.slug = ? AND c.status = 'published' AND c.deleted_at IS NULL
    `).bind(slug).first();
    
    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Increment views
    await env.DB.prepare(`
      UPDATE compilations SET views = views + 1 WHERE id = ?
    `).bind(compilation.id).run();
    
    // Get items
    const items = await env.DB.prepare(`
      SELECT 
        ci.id as item_relation_id,
        ci.item_id,
        ci.display_order
      FROM compilation_items ci
      WHERE ci.compilation_id = ?
      ORDER BY ci.display_order ASC
    `).bind(compilation.id).all();
    
    // Fetch item details based on type
    let itemsWithDetails = [];
    
    if (compilation.type === 'albums') {
      const albumIds = items.results.map(i => i.item_id).filter(id => id).join(',');
      if (albumIds) {
        const albumDetails = await env.DB.prepare(`
          SELECT 
            a.id, a.title, a.slug, a.cover_url, a.release_date,
            ar.name as artist_name, ar.slug as artist_slug,
            (SELECT COUNT(*) FROM album_tracks WHERE album_id = a.id) as track_count
          FROM albums a
          LEFT JOIN artists ar ON a.artist_id = ar.id
          WHERE a.id IN (${albumIds}) AND a.deleted_at IS NULL AND a.status = 'published'
        `).all();
        
        itemsWithDetails = items.results.map(item => ({
          id: item.item_relation_id,
          item_id: item.item_id,
          display_order: item.display_order,
          item: albumDetails.results.find(a => a.id === item.item_id)
        })).filter(i => i.item);
      }
    } 
    else if (compilation.type === 'eps') {
      const epIds = items.results.map(i => i.item_id).filter(id => id).join(',');
      if (epIds) {
        const epDetails = await env.DB.prepare(`
          SELECT 
            e.id, e.title, e.slug, e.cover_url, e.release_date,
            ar.name as artist_name, ar.slug as artist_slug,
            (SELECT COUNT(*) FROM ep_tracks WHERE ep_id = e.id) as track_count
          FROM eps e
          LEFT JOIN artists ar ON e.artist_id = ar.id
          WHERE e.id IN (${epIds}) AND e.deleted_at IS NULL AND e.status = 'published'
        `).all();
        
        itemsWithDetails = items.results.map(item => ({
          id: item.item_relation_id,
          item_id: item.item_id,
          display_order: item.display_order,
          item: epDetails.results.find(e => e.id === item.item_id)
        })).filter(i => i.item);
      }
    } 
    else if (compilation.type === 'artists') {
      const artistIds = items.results.map(i => i.item_id).filter(id => id).join(',');
      if (artistIds) {
        const artistDetails = await env.DB.prepare(`
          SELECT 
            id, name, slug, image_url, country,
            (SELECT COUNT(*) FROM tracks t 
             LEFT JOIN track_artists ta ON t.id = ta.track_id 
             WHERE ta.artist_id = artists.id AND t.deleted_at IS NULL) as track_count
          FROM artists
          WHERE id IN (${artistIds}) AND deleted_at IS NULL AND status = 'published'
        `).all();
        
        itemsWithDetails = items.results.map(item => ({
          id: item.item_relation_id,
          item_id: item.item_id,
          display_order: item.display_order,
          item: artistDetails.results.find(a => a.id === item.item_id)
        })).filter(i => i.item);
      }
    } 
    else if (compilation.type === 'playlists') {
      const playlistIds = items.results.map(i => i.item_id).filter(id => id).join(',');
      if (playlistIds) {
        const playlistDetails = await env.DB.prepare(`
          SELECT 
            id, name, slug, cover_url, created_by, views,
            (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = playlists.id) as track_count
          FROM playlists
          WHERE id IN (${playlistIds}) AND deleted_at IS NULL AND status = 'published'
        `).all();
        
        itemsWithDetails = items.results.map(item => ({
          id: item.item_relation_id,
          item_id: item.item_id,
          display_order: item.display_order,
          item: playlistDetails.results.find(p => p.id === item.item_id)
        })).filter(i => i.item);
      }
    }
    
    return new Response(JSON.stringify({
      ...compilation,
      items: itemsWithDetails,
      views: compilation.views + 1 // Return new view count
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching compilation:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}