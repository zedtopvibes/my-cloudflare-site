export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
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
    // First, get all EPs with basic info - only published and not deleted
    const { results } = await env.DB.prepare(`
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
        a.slug as artist_slug,
        COUNT(et.track_id) as track_count,
        SUM(t.plays) as total_plays,
        SUM(t.downloads) as total_downloads,
        SUM(t.duration) as total_duration
      FROM eps e
      LEFT JOIN artists a ON e.artist_id = a.id
      LEFT JOIN ep_tracks et ON e.id = et.ep_id
      LEFT JOIN tracks t ON et.track_id = t.id
      WHERE e.deleted_at IS NULL AND e.status = 'published'
      GROUP BY e.id
      ORDER BY e.release_date DESC
    `).all();
    
    // For each EP, fetch its tracks
    const epsWithTracks = await Promise.all(
      results.map(async (ep) => {
        // Get tracks for this EP - only published tracks
        const tracksResult = await env.DB.prepare(`
          SELECT 
            t.id,
            t.title,
            t.slug,
            t.duration,
            t.plays,
            t.artwork_url,
            et.track_number,
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
          WHERE et.ep_id = ? AND t.deleted_at IS NULL AND t.status = 'published'
          GROUP BY t.id
          ORDER BY et.track_number
        `).bind(ep.id).all();
        
        // Process tracks to parse artists JSON
        const processedTracks = tracksResult.results.map(track => {
          const artists = track.artists ? JSON.parse(track.artists) : [];
          const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
          
          return {
            id: track.id,
            title: track.title,
            slug: track.slug,
            duration: track.duration,
            plays: track.plays,
            artwork_url: track.artwork_url,
            track_number: track.track_number,
            artists: artists,
            artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
            artist_id: primaryArtist ? primaryArtist.id : null
          };
        });
        
        return {
          ...ep,
          tracks: processedTracks,
          artist: ep.artist_name || 'Unknown Artist'
        };
      })
    );
    
    return new Response(JSON.stringify(epsWithTracks), { headers });
    
  } catch (error) {
    console.error('Error fetching EPs:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}