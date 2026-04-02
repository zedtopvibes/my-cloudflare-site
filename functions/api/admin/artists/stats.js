export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // Get aggregated artist stats
    const artistStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_artists,
        COALESCE(SUM(views), 0) as total_views,
        COALESCE(AVG(views), 0) as avg_views,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM artists
      WHERE deleted_at IS NULL
    `).first();
    
    // Get total tracks count
    const trackStats = await env.DB.prepare(`
      SELECT COUNT(*) as total_tracks
      FROM tracks
      WHERE deleted_at IS NULL
    `).first();
    
    // Get total albums count
    const albumStats = await env.DB.prepare(`
      SELECT COUNT(*) as total_albums
      FROM albums
      WHERE deleted_at IS NULL
    `).first();
    
    // Get total EPs count
    const epStats = await env.DB.prepare(`
      SELECT COUNT(*) as total_eps
      FROM eps
      WHERE deleted_at IS NULL
    `).first();
    
    // Get individual artists with their track, album, and EP counts
    // Using only columns that exist in your database
    const artists = await env.DB.prepare(`
      SELECT 
        a.id,
        a.name,
        a.slug,
        a.country,
        a.image_url,
        a.views,
        a.status,
        a.is_featured,
        a.is_zambian_legend,
        a.created_at,
        (
          SELECT COUNT(DISTINCT ta.track_id)
          FROM track_artists ta
          WHERE ta.artist_id = a.id
        ) as track_count,
        (
          SELECT COUNT(*)
          FROM albums al
          WHERE al.artist_id = a.id AND al.deleted_at IS NULL
        ) as album_count,
        (
          SELECT COUNT(*)
          FROM eps e
          WHERE e.artist_id = a.id AND e.deleted_at IS NULL
        ) as ep_count
      FROM artists a
      WHERE a.deleted_at IS NULL
      ORDER BY a.views DESC
    `).all();
    
    const response = {
      success: true,
      data: {
        summary: {
          artists: {
            total: artistStats.total_artists || 0,
            total_views: artistStats.total_views || 0,
            avg_views: Math.round(artistStats.avg_views) || 0,
            published: artistStats.published || 0,
            draft: artistStats.draft || 0
          },
          tracks: {
            total: trackStats.total_tracks || 0
          },
          albums: {
            total: albumStats.total_albums || 0
          },
          eps: {
            total: epStats.total_eps || 0
          }
        },
        artists: artists.results.map(artist => ({
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          country: artist.country || 'Unknown',
          image_url: artist.image_url,
          views: artist.views || 0,
          status: artist.status || 'draft',
          is_featured: artist.is_featured === 1,
          is_zambian_legend: artist.is_zambian_legend === 1,
          created_at: artist.created_at,
          track_count: parseInt(artist.track_count) || 0,
          album_count: parseInt(artist.album_count) || 0,
          ep_count: parseInt(artist.ep_count) || 0
        }))
      }
    };
    
    return new Response(JSON.stringify(response), { headers });
    
  } catch (error) {
    console.error('Error fetching artist stats:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers 
    });
  }
}