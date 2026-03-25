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
    
    // Get album by slug with artist info
    const album = await env.DB.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.cover_url,
        a.release_date,
        a.genre,
        a.label,
        a.plays,
        a.downloads,
        a.views,
        a.slug,
        a.is_featured,
        a.created_at,
        a.updated_at,
        a.artist_id,
        ar.name as artist_name,
        ar.slug as artist_slug
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      WHERE a.slug = ?
    `).bind(slug).first();
    
    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get tracks in this album with full artist information
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
        at.track_number,
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
      JOIN album_tracks at ON t.id = at.track_id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE at.album_id = ?
      GROUP BY t.id
      ORDER BY at.track_number
    `).bind(album.id).all();
    
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
    
    // Get album stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.views) as total_views,
        SUM(t.duration) as total_duration
      FROM tracks t
      JOIN album_tracks at ON t.id = at.track_id
      WHERE at.album_id = ?
    `).bind(album.id).first();
    
    // Add artist field to album for backward compatibility
    const albumData = {
      ...album,
      artist: album.artist_name || 'Unknown Artist',
      tracks: processedTracks || [],
      stats: {
        track_count: stats.track_count || 0,
        total_plays: stats.total_plays || 0,
        total_downloads: stats.total_downloads || 0,
        total_views: stats.total_views || 0,
        total_duration: stats.total_duration || 0
      }
    };
    
    return new Response(JSON.stringify(albumData), { headers });
    
  } catch (error) {
    console.error('Error fetching album:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
