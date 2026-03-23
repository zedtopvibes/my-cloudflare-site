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
    
    // Get EP by slug
    const ep = await env.DB.prepare(`
      SELECT 
        id,
        title,
        artist,
        description,
        cover_url,
        release_date,
        genre,
        label,
        plays,
        downloads,
        views,
        slug,
        is_featured
      FROM eps WHERE slug = ?
    `).bind(slug).first();
    
    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in this EP
    const { results: tracks } = await env.DB.prepare(`
      SELECT 
        t.*,
        et.track_number
      FROM tracks t
      JOIN ep_tracks et ON t.id = et.track_id
      WHERE et.ep_id = ?
      ORDER BY et.track_number
    `).bind(ep.id).all();
    
    // Get EP stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.views) as total_views,
        SUM(t.duration) as total_duration
      FROM tracks t
      JOIN ep_tracks et ON t.id = et.track_id
      WHERE et.ep_id = ?
    `).bind(ep.id).first();
    
    return new Response(JSON.stringify({
      ...ep,
      tracks: tracks || [],
      stats: {
        track_count: stats.track_count || 0,
        total_plays: stats.total_plays || 0,
        total_downloads: stats.total_downloads || 0,
        total_views: stats.total_views || 0,
        total_duration: stats.total_duration || 0
      }
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching EP:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}