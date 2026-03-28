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
    const { results } = await env.DB.prepare(`
      SELECT 
        a.id,
        a.name,
        a.slug,
        a.bio,
        a.genre,
        a.created_at,
        
        -- Track counts
        COUNT(DISTINCT ta.track_id) as track_count,
        
        -- Primary tracks count
        COUNT(DISTINCT CASE WHEN ta.is_primary = 1 THEN ta.track_id END) as primary_track_count,
        
        -- Featured tracks count
        COUNT(DISTINCT CASE WHEN ta.is_primary = 0 THEN ta.track_id END) as featured_track_count,
        
        -- Play stats
        SUM(t.plays) as total_plays,
        AVG(t.plays) as avg_plays,
        MAX(t.plays) as most_played_single_plays,
        
        -- Download stats
        SUM(t.downloads) as total_downloads,
        AVG(t.downloads) as avg_downloads,
        MAX(t.downloads) as most_downloaded_single_downloads,
        
        -- View stats
        SUM(t.views) as total_views,
        AVG(t.views) as avg_views,
        MAX(t.views) as most_viewed_single_views,
        
        -- Date info
        MIN(t.uploaded_at) as first_release,
        MAX(t.uploaded_at) as latest_release,
        
        -- Genres from tracks
        GROUP_CONCAT(DISTINCT t.genre) as genres,
        
        -- Track IDs
        GROUP_CONCAT(DISTINCT ta.track_id) as track_ids,
        
        -- Track titles
        GROUP_CONCAT(DISTINCT t.title) as track_titles
        
      FROM artists a
      LEFT JOIN track_artists ta ON a.id = ta.artist_id
      LEFT JOIN tracks t ON ta.track_id = t.id
      WHERE a.deleted_at IS NULL AND a.status = 'published'
        AND (t.id IS NULL OR (t.deleted_at IS NULL AND t.status = 'published'))
      GROUP BY a.id
      ORDER BY total_plays DESC
    `).all();

    const artists = results.map(artist => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      bio: artist.bio,
      genre: artist.genre || null,
      created_at: artist.created_at,
      
      track_count: parseInt(artist.track_count) || 0,
      primary_track_count: parseInt(artist.primary_track_count) || 0,
      featured_track_count: parseInt(artist.featured_track_count) || 0,
      
      plays: {
        total: parseInt(artist.total_plays) || 0,
        average: Math.round(parseFloat(artist.avg_plays)) || 0,
        best: parseInt(artist.most_played_single_plays) || 0
      },
      
      downloads: {
        total: parseInt(artist.total_downloads) || 0,
        average: Math.round(parseFloat(artist.avg_downloads)) || 0,
        best: parseInt(artist.most_downloaded_single_downloads) || 0
      },
      
      views: {
        total: parseInt(artist.total_views) || 0,
        average: Math.round(parseFloat(artist.avg_views)) || 0,
        best: parseInt(artist.most_viewed_single_views) || 0
      },
      
      first_release: artist.first_release,
      latest_release: artist.latest_release,
      
      genres: artist.genres ? [...new Set(artist.genres.split(',').filter(g => g && g !== 'null'))] : [],
      
      track_ids: artist.track_ids ? artist.track_ids.split(',').map(Number) : [],
      
      track_titles: artist.track_titles ? [...new Set(artist.track_titles.split(','))] : []
    }));
    
    return new Response(JSON.stringify(artists), { headers });
    
  } catch (error) {
    console.error('Error fetching artists:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}