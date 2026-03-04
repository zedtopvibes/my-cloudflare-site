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
    // Get ALL artist stats from tracks table
    const { results } = await env.DB.prepare(`
      SELECT 
        -- Basic info
        artist as name,
        artist_slug as slug,
        
        -- Track counts
        COUNT(*) as track_count,
        
        -- Play stats
        SUM(plays) as total_plays,
        AVG(plays) as avg_plays,
        MAX(plays) as most_played_single_plays,
        
        -- Download stats
        SUM(downloads) as total_downloads,
        AVG(downloads) as avg_downloads,
        MAX(downloads) as most_downloaded_single_downloads,
        
        -- View stats
        SUM(views) as total_views,
        AVG(views) as avg_views,
        MAX(views) as most_viewed_single_views,
        
        -- Date info
        MIN(uploaded_at) as first_release,
        MAX(uploaded_at) as latest_release,
        
        -- Genres (as JSON array)
        GROUP_CONCAT(DISTINCT genre) as genres,
        
        -- Track IDs (for reference)
        GROUP_CONCAT(id) as track_ids,
        
        -- Track titles (for reference)
        GROUP_CONCAT(title) as track_titles
        
      FROM tracks 
      WHERE artist IS NOT NULL AND artist != ''
      GROUP BY artist, artist_slug
      ORDER BY total_plays DESC
    `).all();

    // Process results to make them more usable
    const artists = results.map(artist => ({
      name: artist.name,
      slug: artist.slug,
      
      // Stats
      track_count: parseInt(artist.track_count) || 0,
      
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
      
      // Dates
      first_release: artist.first_release,
      latest_release: artist.latest_release,
      
      // Genres (split the concatenated string)
      genres: artist.genres ? artist.genres.split(',') : [],
      
      // Track IDs (for reference)
      track_ids: artist.track_ids ? artist.track_ids.split(',').map(Number) : [],
      
      track_titles: artist.track_titles ? artist.track_titles.split(',') : []
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