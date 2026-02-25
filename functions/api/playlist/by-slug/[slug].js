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
    
    // Get playlist by slug
    const playlist = await env.DB.prepare(`
      SELECT * FROM playlists WHERE slug = ?
    `).bind(slug).first();
    
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in this playlist
    const { results: tracks } = await env.DB.prepare(`
      SELECT 
        t.*,
        pt.position
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position
    `).bind(playlist.id).all();
    
    // Get playlist stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.views) as total_views,
        SUM(t.duration) as total_duration
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
    `).bind(playlist.id).first();
    
    return new Response(JSON.stringify({
      ...playlist,
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
    console.error('Error fetching playlist:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}