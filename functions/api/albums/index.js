export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // Get all albums with artist info
    const albums = await env.DB.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.cover_url,
        a.slug,
        a.release_date,
        a.plays,
        a.created_at,
        a.updated_at,
        a.artist_id,
        ar.name as artist_name,
        ar.slug as artist_slug
      FROM albums a
      LEFT JOIN artists ar ON a.artist_id = ar.id
      ORDER BY a.created_at DESC
    `).all();
    
    // For each album, get its tracks with full artist information
    const albumsWithTracks = await Promise.all(
      albums.results.map(async (album) => {
        const tracks = await env.DB.prepare(`
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
        
        // Process tracks to parse artists JSON and add backward compatibility
        const processedTracks = tracks.results.map(track => {
          const artists = track.artists ? JSON.parse(track.artists) : [];
          const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
          
          return {
            ...track,
            artists: artists,
            artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
            artist_id: primaryArtist ? primaryArtist.id : null,
            artist_slug: primaryArtist ? primaryArtist.slug : null
          };
        });
        
        return {
          ...album,
          artist: album.artist_name || 'Unknown Artist',
          tracks: processedTracks,
          track_count: processedTracks.length
        };
      })
    );
    
    return new Response(JSON.stringify(albumsWithTracks), { headers });

  } catch (error) {
    console.error('Error fetching albums:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
