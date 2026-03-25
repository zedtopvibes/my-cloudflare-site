export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
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
    
    // Construct the final track object
    const trackData = {
      ...track,
      artists: artists,
      // Add convenience fields for backward compatibility
      artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
      artist_id: primaryArtist ? primaryArtist.id : null,
      artist_slug: primaryArtist ? primaryArtist.slug : null
    };
    
    // Remove the raw artists string (we already parsed it)
    delete trackData.artists_raw;
    
    return new Response(JSON.stringify(trackData), { headers });
    
  } catch (error) {
    console.error('Error fetching track:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
