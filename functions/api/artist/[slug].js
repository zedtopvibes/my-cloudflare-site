export async function onRequest(context) {
  const { request, env, params } = context;
  
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
    const slug = params.slug;
    
    // Find artist by slug
    const tracks = await env.DB.prepare(`
      SELECT * FROM tracks WHERE artist_slug = ?
    `).bind(slug).all();
    
    if (!tracks.results || tracks.results.length === 0) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get artist name from first track
    const artistName = tracks.results[0].artist;
    
    // Calculate artist stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(plays) as total_plays,
        SUM(downloads) as total_downloads,
        SUM(views) as total_views,
        MIN(uploaded_at) as first_release,
        MAX(uploaded_at) as latest_release,
        GROUP_CONCAT(DISTINCT genre) as genres
      FROM tracks WHERE artist_slug = ?
    `).bind(slug).first();
    
    return new Response(JSON.stringify({
      name: artistName,
      slug: slug,
      tracks: tracks.results,
      stats: {
        track_count: stats.track_count || 0,
        total_plays: stats.total_plays || 0,
        total_downloads: stats.total_downloads || 0,
        total_views: stats.total_views || 0,
        first_release: stats.first_release,
        latest_release: stats.latest_release,
        genres: stats.genres ? stats.genres.split(',') : []
      }
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching artist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}