export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const slug = params.slug;
    
    console.log('Fetching compilation with slug:', slug);
    
    // Get compilation details
    const compilation = await env.DB.prepare(`
      SELECT 
        id,
        title,
        description,
        type,
        slug,
        cover_url,
        is_featured,
        views,
        created_by,
        created_at
      FROM compilations 
      WHERE slug = ? AND status = 'published' AND deleted_at IS NULL
    `).bind(slug).first();
    
    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    console.log('Compilation found:', compilation.title);
    
    // Get items in this compilation
    const { results: items } = await env.DB.prepare(`
      SELECT 
        ci.id as relation_id,
        ci.item_id,
        ci.display_order
      FROM compilation_items ci
      WHERE ci.compilation_id = ?
      ORDER BY ci.display_order ASC
    `).bind(compilation.id).all();
    
    console.log('Items found:', items.length);
    
    // Fetch item details based on compilation type
    let itemsWithDetails = [];
    
    if (items.length > 0) {
      const itemIds = items.map(i => i.item_id).join(',');
      
      if (compilation.type === 'albums') {
        const { results: albums } = await env.DB.prepare(`
          SELECT 
            a.id,
            a.title,
            a.slug,
            a.cover_url,
            a.release_date,
            ar.name as artist_name,
            ar.slug as artist_slug,
            (SELECT COUNT(*) FROM album_tracks WHERE album_id = a.id) as track_count
          FROM albums a
          LEFT JOIN artists ar ON a.artist_id = ar.id
          WHERE a.id IN (${itemIds}) AND a.deleted_at IS NULL AND a.status = 'published'
        `).all();
        
        itemsWithDetails = items.map(item => {
          const found = albums.find(a => a.id === item.item_id);
          return found ? {
            id: item.relation_id,
            item_id: item.item_id,
            display_order: item.display_order,
            item: found
          } : null;
        }).filter(i => i !== null);
        
      } else if (compilation.type === 'eps') {
        const { results: eps } = await env.DB.prepare(`
          SELECT 
            e.id,
            e.title,
            e.slug,
            e.cover_url,
            e.release_date,
            ar.name as artist_name,
            ar.slug as artist_slug,
            (SELECT COUNT(*) FROM ep_tracks WHERE ep_id = e.id) as track_count
          FROM eps e
          LEFT JOIN artists ar ON e.artist_id = ar.id
          WHERE e.id IN (${itemIds}) AND e.deleted_at IS NULL AND e.status = 'published'
        `).all();
        
        itemsWithDetails = items.map(item => {
          const found = eps.find(e => e.id === item.item_id);
          return found ? {
            id: item.relation_id,
            item_id: item.item_id,
            display_order: item.display_order,
            item: found
          } : null;
        }).filter(i => i !== null);
        
      } else if (compilation.type === 'artists') {
        const { results: artists } = await env.DB.prepare(`
          SELECT 
            id,
            name,
            slug,
            image_url,
            country,
            (SELECT COUNT(*) FROM tracks t 
             LEFT JOIN track_artists ta ON t.id = ta.track_id 
             WHERE ta.artist_id = artists.id AND t.deleted_at IS NULL) as track_count
          FROM artists
          WHERE id IN (${itemIds}) AND deleted_at IS NULL AND status = 'published'
        `).all();
        
        itemsWithDetails = items.map(item => {
          const found = artists.find(a => a.id === item.item_id);
          return found ? {
            id: item.relation_id,
            item_id: item.item_id,
            display_order: item.display_order,
            item: found
          } : null;
        }).filter(i => i !== null);
        
      } else if (compilation.type === 'playlists') {
        const { results: playlists } = await env.DB.prepare(`
          SELECT 
            id,
            name,
            slug,
            cover_url,
            created_by,
            (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = playlists.id) as track_count
          FROM playlists
          WHERE id IN (${itemIds}) AND deleted_at IS NULL AND status = 'published'
        `).all();
        
        itemsWithDetails = items.map(item => {
          const found = playlists.find(p => p.id === item.item_id);
          return found ? {
            id: item.relation_id,
            item_id: item.item_id,
            display_order: item.display_order,
            item: found
          } : null;
        }).filter(i => i !== null);
      }
    }
    
    compilation.items = itemsWithDetails;
    
    // Increment view count asynchronously (don't wait for it)
    env.DB.prepare(`
      UPDATE compilations SET views = views + 1 WHERE id = ?
    `).bind(compilation.id).run().catch(e => console.error('Error updating views:', e));
    
    return new Response(JSON.stringify(compilation), { headers });
    
  } catch (error) {
    console.error('Error fetching compilation:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}