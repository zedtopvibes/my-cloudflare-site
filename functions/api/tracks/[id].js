export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Updated query to fetch track with album AND EP info
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
        
        -- Album info (if track is in an album)
        (SELECT a.id FROM albums a 
         JOIN album_tracks at ON a.id = at.album_id 
         WHERE at.track_id = t.id LIMIT 1) as album_id,
        (SELECT a.title FROM albums a 
         JOIN album_tracks at ON a.id = at.album_id 
         WHERE at.track_id = t.id LIMIT 1) as album_name,
        (SELECT a.slug FROM albums a 
         JOIN album_tracks at ON a.id = at.album_id 
         WHERE at.track_id = t.id LIMIT 1) as album_slug,
        (SELECT a.cover_url FROM albums a 
         JOIN album_tracks at ON a.id = at.album_id 
         WHERE at.track_id = t.id LIMIT 1) as album_cover_url,
        (SELECT at.track_number FROM album_tracks at 
         WHERE at.track_id = t.id LIMIT 1) as album_track_number,
        
        -- EP info (if track is in an EP)
        (SELECT e.id FROM eps e 
         JOIN ep_tracks et ON e.id = et.ep_id 
         WHERE et.track_id = t.id LIMIT 1) as ep_id,
        (SELECT e.title FROM eps e 
         JOIN ep_tracks et ON e.id = et.ep_id 
         WHERE et.track_id = t.id LIMIT 1) as ep_name,
        (SELECT e.slug FROM eps e 
         JOIN ep_tracks et ON e.id = et.ep_id 
         WHERE et.track_id = t.id LIMIT 1) as ep_slug,
        (SELECT e.cover_url FROM eps e 
         JOIN ep_tracks et ON e.id = et.ep_id 
         WHERE et.track_id = t.id LIMIT 1) as ep_cover_url,
        (SELECT et.track_number FROM ep_tracks et 
         WHERE et.track_id = t.id LIMIT 1) as ep_track_number,
        
        -- Artists array
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
      WHERE t.id = ?
      GROUP BY t.id
    `).bind(params.id).first();
    
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
    
    // Determine release type (album or EP)
    let releaseType = 'single';
    let releaseId = null;
    let releaseName = null;
    let releaseSlug = null;
    let releaseCoverUrl = null;
    let trackNumber = null;
    
    if (track.album_id) {
      releaseType = 'album';
      releaseId = track.album_id;
      releaseName = track.album_name;
      releaseSlug = track.album_slug;
      releaseCoverUrl = track.album_cover_url;
      trackNumber = track.album_track_number;
    } else if (track.ep_id) {
      releaseType = 'ep';
      releaseId = track.ep_id;
      releaseName = track.ep_name;
      releaseSlug = track.ep_slug;
      releaseCoverUrl = track.ep_cover_url;
      trackNumber = track.ep_track_number;
    }
    
    // Construct the final track object
    const trackData = {
      ...track,
      artists: artists,
      // Add convenience fields for backward compatibility
      artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
      artist_id: primaryArtist ? primaryArtist.id : null,
      artist_slug: primaryArtist ? primaryArtist.slug : null,
      // Release info
      release_type: releaseType,
      release_id: releaseId,
      release_name: releaseName,
      release_slug: releaseSlug,
      release_cover_url: releaseCoverUrl,
      track_number: trackNumber
    };
    
    // Remove the raw artists string
    delete trackData.artists;
    
    return new Response(JSON.stringify(trackData), { headers });
    
  } catch (error) {
    console.error('Error fetching track:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}