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
    
    // Get EP details with artist info
    const ep = await env.DB.prepare(`
      SELECT 
        e.id,
        e.title,
        e.description,
        e.cover_url,
        e.slug,
        e.release_date,
        e.plays,
        e.created_at,
        e.updated_at,
        e.artist_id,
        a.name as artist_name,
        a.slug as artist_slug
      FROM eps e
      LEFT JOIN artists a ON e.artist_id = a.id
      WHERE e.id = ?
    `).bind(id).first();
    
    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in EP with full artist information
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
        et.track_number,
        et.disc_number,
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
      JOIN ep_tracks et ON t.id = et.track_id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE et.ep_id = ?
      GROUP BY t.id
      ORDER BY et.disc_number, et.track_number
    `).bind(id).all();
    
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
    
    // Get EP stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM tracks t
      JOIN ep_tracks et ON t.id = et.track_id
      WHERE et.ep_id = ?
    `).bind(id).first();
    
    // Add artist fields to EP for backward compatibility
    const epData = {
      ...ep,
      artist: ep.artist_name || 'Unknown Artist',
      tracks: processedTracks || [],
      stats: {
        track_count: stats.track_count || 0,
        total_plays: stats.total_plays || 0,
        total_downloads: stats.total_downloads || 0,
        total_duration: stats.total_duration || 0
      }
    };
    
    return new Response(JSON.stringify(epData), { headers });
    
  } catch (error) {
    console.error('Error fetching EP:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}