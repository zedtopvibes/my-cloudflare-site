export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { results } = await env.DB.prepare(`
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
      GROUP BY t.id
      ORDER BY t.uploaded_at DESC
    `).all();
    
    // Process results to parse the JSON artists string
    const processedResults = results.map(track => {
      const artists = track.artists ? JSON.parse(track.artists) : [];
      
      // Find primary artist for backward compatibility
      const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
      
      return {
        ...track,
        artists: artists,
        // Add convenience fields for backward compatibility
        artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
        artist_slug: primaryArtist ? primaryArtist.slug : null,
        artist_id: primaryArtist ? primaryArtist.id : null
      };
    });
    
    return new Response(JSON.stringify(processedResults), { headers });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
