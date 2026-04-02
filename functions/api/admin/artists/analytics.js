export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
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
    // Get pagination parameters
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    const sort = url.searchParams.get('sort') || 'views-desc';
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for search
    let whereConditions = ['a.deleted_at IS NULL'];
    let params = [];
    
    if (search) {
      whereConditions.push('(a.name LIKE ? OR a.country LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Build ORDER BY
    let orderBy = '';
    switch(sort) {
      case 'views-asc':
        orderBy = 'ORDER BY a.views ASC';
        break;
      case 'name-asc':
        orderBy = 'ORDER BY a.name ASC';
        break;
      case 'name-desc':
        orderBy = 'ORDER BY a.name DESC';
        break;
      case 'tracks-desc':
        orderBy = 'ORDER BY track_count DESC';
        break;
      case 'tracks-asc':
        orderBy = 'ORDER BY track_count ASC';
        break;
      default:
        orderBy = 'ORDER BY a.views DESC';
    }
    
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM artists a WHERE ${whereClause}`;
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult.total;
    
    // Get paginated artists with counts
    const artistsQuery = `
      SELECT 
        a.id,
        a.name,
        a.country,
        a.image_url,
        a.photo_url,
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
      WHERE ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    
    const artists = await env.DB.prepare(artistsQuery)
      .bind(...params, limit, offset)
      .all();
    
    // Get summary stats (lightweight, counts only)
    const summaryStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_artists,
        COALESCE(SUM(views), 0) as total_views,
        COALESCE(AVG(views), 0) as avg_views,
        (SELECT COUNT(*) FROM tracks WHERE deleted_at IS NULL) as total_tracks
      FROM artists
      WHERE deleted_at IS NULL
    `).first();
    
    // Process artists to ensure counts are numbers
    const processedArtists = artists.results.map(artist => ({
      id: artist.id,
      name: artist.name,
      country: artist.country || 'Unknown',
      image_url: artist.image_url,
      photo_url: artist.photo_url,
      views: artist.views || 0,
      status: artist.status || 'draft',
      is_featured: artist.is_featured === 1,
      is_zambian_legend: artist.is_zambian_legend === 1,
      created_at: artist.created_at,
      track_count: parseInt(artist.track_count) || 0,
      album_count: parseInt(artist.album_count) || 0,
      ep_count: parseInt(artist.ep_count) || 0
    }));
    
    const response = {
      success: true,
      data: {
        summary: {
          total_artists: summaryStats.total_artists || 0,
          total_views: summaryStats.total_views || 0,
          avg_views: Math.round(summaryStats.avg_views) || 0,
          total_tracks: summaryStats.total_tracks || 0
        },
        artists: processedArtists
      },
      pagination: {
        page: page,
        limit: limit,
        total: total,
        total_pages: Math.ceil(total / limit)
      }
    };
    
    return new Response(JSON.stringify(response), { headers });
    
  } catch (error) {
    console.error('Error fetching artist analytics:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers 
    });
  }
}