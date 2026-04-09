export async function onRequest(context) {
  const { request, env, params } = context;
  const sectionId = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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
    const section = await env.DB.prepare(`
      SELECT source_type, source_id FROM homepage_sections WHERE id = ?
    `).bind(sectionId).first();
    
    if (!section) {
      return new Response(JSON.stringify({ error: 'Section not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    let items = [];
    
    if (section.source_type === 'playlist') {
      const { results: tracks } = await env.DB.prepare(`
        SELECT 
          t.id, t.title, t.slug, t.artwork_url as cover_url,
          t.duration,
          json_group_array(
            json_object('id', a.id, 'name', a.name, 'is_primary', ta.is_primary)
          ) as artists
        FROM playlist_tracks pt
        JOIN tracks t ON pt.track_id = t.id
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        WHERE pt.playlist_id = ? AND t.deleted_at IS NULL AND t.status = 'published'
        GROUP BY t.id
        ORDER BY pt.position
        LIMIT 6
      `).bind(section.source_id).all();
      
      items = tracks.map(track => {
        let artists = [];
        try { artists = JSON.parse(track.artists); } catch(e) {}
        const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
        return {
          id: track.id,
          title: track.title,
          slug: track.slug,
          cover_url: track.cover_url,
          duration: track.duration,
          artist: primaryArtist?.name || 'Unknown Artist',
          type: 'track'
        };
      });
      
    } else if (section.source_type === 'compilation') {
      const compilation = await env.DB.prepare(`
        SELECT type FROM compilations WHERE id = ?
      `).bind(section.source_id).first();
      
      if (compilation) {
        const { results: itemIds } = await env.DB.prepare(`
          SELECT ci.item_id
          FROM compilation_items ci
          WHERE ci.compilation_id = ?
          LIMIT 6
        `).bind(section.source_id).all();
        
        if (itemIds.length > 0) {
          const idList = itemIds.map(i => i.item_id).join(',');
          
          if (compilation.type === 'albums') {
            const { results: albums } = await env.DB.prepare(`
              SELECT a.id, a.title, a.slug, a.cover_url, ar.name as artist_name
              FROM albums a
              LEFT JOIN artists ar ON a.artist_id = ar.id
              WHERE a.id IN (${idList}) AND a.deleted_at IS NULL AND a.status = 'published'
            `).all();
            items = albums.map(album => ({
              id: album.id,
              title: album.title,
              slug: album.slug,
              cover_url: album.cover_url,
              artist: album.artist_name || 'Various Artists',
              type: 'album'
            }));
          } else if (compilation.type === 'eps') {
            const { results: eps } = await env.DB.prepare(`
              SELECT e.id, e.title, e.slug, e.cover_url, ar.name as artist_name
              FROM eps e
              LEFT JOIN artists ar ON e.artist_id = ar.id
              WHERE e.id IN (${idList}) AND e.deleted_at IS NULL AND e.status = 'published'
            `).all();
            items = eps.map(ep => ({
              id: ep.id,
              title: ep.title,
              slug: ep.slug,
              cover_url: ep.cover_url,
              artist: ep.artist_name || 'Various Artists',
              type: 'ep'
            }));
          } else if (compilation.type === 'artists') {
            const { results: artists } = await env.DB.prepare(`
              SELECT id, name, slug, image_url as cover_url, country
              FROM artists
              WHERE id IN (${idList}) AND deleted_at IS NULL AND status = 'published'
            `).all();
            items = artists.map(artist => ({
              id: artist.id,
              title: artist.name,
              slug: artist.slug,
              cover_url: artist.cover_url,
              artist: artist.country || 'Artist',
              type: 'artist'
            }));
          } else if (compilation.type === 'playlists') {
            const { results: playlists } = await env.DB.prepare(`
              SELECT id, name, slug, cover_url, created_by
              FROM playlists
              WHERE id IN (${idList}) AND deleted_at IS NULL AND status = 'published'
            `).all();
            items = playlists.map(playlist => ({
              id: playlist.id,
              title: playlist.name,
              slug: playlist.slug,
              cover_url: playlist.cover_url,
              artist: playlist.created_by || 'Zedtopvibes',
              type: 'playlist'
            }));
          }
        }
      }
    }
    
    return new Response(JSON.stringify(items), { headers });
    
  } catch (error) {
    console.error('Error fetching section items:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}