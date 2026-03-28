export async function onRequest(context) {
  const { request, env, params } = context;
  const genre = decodeURIComponent(params.genre);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Get counts
    const [artistCount, albumCount, epCount] = await Promise.all([
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM artists 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first(),
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM albums 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first(),
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM eps 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first()
    ]);
    
    // Get top tracks in this genre
    const topTracks = await env.DB.prepare(`
      SELECT 
        t.id,
        t.title,
        t.slug,
        t.duration,
        t.plays,
        t.artwork_url,
        json_group_array(
          json_object(
            'id', a.id,
            'name', a.name,
            'slug', a.slug
          )
        ) as artists
      FROM tracks t
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE t.deleted_at IS NULL 
        AND t.status = 'published'
        AND t.genre = ?
      GROUP BY t.id
      ORDER BY t.plays DESC
      LIMIT 10
    `).bind(genre).all();
    
    const processedTracks = topTracks.results.map(track => {
      let artists = [];
      try {
        artists = JSON.parse(track.artists);
      } catch (e) {
        artists = [];
      }
      const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
      
      return {
        id: track.id,
        title: track.title,
        slug: track.slug,
        duration: track.duration,
        plays: track.plays,
        artwork_url: track.artwork_url,
        artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
        artist_slug: primaryArtist ? primaryArtist.slug : null
      };
    });
    
    return new Response(JSON.stringify({
      genre: genre,
      stats: {
        artists: artistCount?.count || 0,
        albums: albumCount?.count || 0,
        eps: epCount?.count || 0,
        total_tracks: processedTracks.length
      },
      top_tracks: processedTracks
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching genre stats:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}