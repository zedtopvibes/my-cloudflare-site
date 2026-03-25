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
    
    // Updated query to join with track_artists and artists tables
    const track = await env.DB.prepare(`
      SELECT 
        t.id,
        t.title,
        t.description,
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
        t.artwork_url,
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
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE t.slug = ?
      GROUP BY t.id
    `).bind(slug).first();
    
    if (!track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Parse the artists JSON string
    const artists = track.artists ? JSON.parse(track.artists) : [];
    
    // Find primary artist for backward compatibility
    const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
    
    // Get album info if track is part of an album
    let albumInfo = null;
    if (track.id) {
      const album = await env.DB.prepare(`
        SELECT 
          a.id as album_id,
          a.title as album_name,
          a.slug as album_slug,
          a.cover_url as album_cover_url
        FROM albums a
        JOIN album_tracks at ON a.id = at.album_id
        WHERE at.track_id = ?
        LIMIT 1
      `).bind(track.id).first();
      
      if (album) {
        albumInfo = album;
      }
    }
    
    // Construct the final track object
    const trackData = {
      ...track,
      artists: artists,
      // Add convenience fields for backward compatibility
      artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
      artist_id: primaryArtist ? primaryArtist.id : null,
      artist_slug: primaryArtist ? primaryArtist.slug : null,
      // Add album info if available
      ...(albumInfo && {
        album_id: albumInfo.album_id,
        album_name: albumInfo.album_name,
        album_slug: albumInfo.album_slug,
        album_cover_url: albumInfo.album_cover_url
      })
    };
    
    // Remove the raw artists string (we already parsed it)
    delete trackData.artists_raw;
    
    return new Response(JSON.stringify(trackData), { headers });
    
  } catch (error) {
    console.error('Error fetching track by slug:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
