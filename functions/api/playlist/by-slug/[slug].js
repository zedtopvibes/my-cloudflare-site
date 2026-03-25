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
    
    // Get playlist details - WITH cover_url
    const playlist = await env.DB.prepare(`
      SELECT 
        id,
        name,
        description,
        cover_url,
        created_by,
        created_at,
        plays,
        downloads,
        views,
        slug,
        is_featured
      FROM playlists WHERE slug = ?
    `).bind(slug).first();
    
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in this playlist with full artist information
    const { results: tracks } = await env.DB.prepare(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.artwork_url,
        t.r2_key,
        t.filename,
        t.duration,
        t.genre,
        t.plays,
        t.downloads,
        t.views,
        t.slug,
        t.uploaded_at,
        t.release_date,
        t.bpm,
        t.explicit,
        t.featured as is_featured,
        t.editor_pick,
        pt.position,
        json_group_array(
          json_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug,
            'is_primary', ta.is_primary,
            'display_order', ta.display_order
          )
          ORDER BY ta.display_order ASC, ta.is_primary DESC
        ) as artists
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE pt.playlist_id = ?
      GROUP BY t.id
      ORDER BY pt.position
    `).bind(playlist.id).all();
    
    // Process each track to parse the artists JSON and add backward compatibility fields
    const processedTracks = tracks.map(track => {
      const artists = track.artists ? JSON.parse(track.artists) : [];
      const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
      
      return {
        ...track,
        artists: artists,
        // Add convenience fields for backward compatibility
        artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
        artist_id: primaryArtist ? primaryArtist.id : null,
        artist_slug: primaryArtist ? primaryArtist.slug : null
      };
    });
    
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
      tracks: processedTracks || [],
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