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
    const id = params.id;
    
    // Get album details
    const album = await env.DB.prepare(`
      SELECT * FROM albums WHERE id = ?
    `).bind(id).first();
    
    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in album with all their details
    const { results: tracks } = await env.DB.prepare(`
      SELECT 
        t.*,
        at.track_number,
        at.disc_number
      FROM tracks t
      JOIN album_tracks at ON t.id = at.track_id
      WHERE at.album_id = ?
      ORDER BY at.disc_number, at.track_number
    `).bind(id).all();
    
    // Get album stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM tracks t
      JOIN album_tracks at ON t.id = at.track_id
      WHERE at.album_id = ?
    `).bind(id).first();
    
    return new Response(JSON.stringify({
      ...album,
      tracks,
      stats: {
        track_count: stats.track_count || 0,
        total_plays: stats.total_plays || 0,
        total_downloads: stats.total_downloads || 0,
        total_duration: stats.total_duration || 0
      }
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching album:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}