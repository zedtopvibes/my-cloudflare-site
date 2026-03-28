export async function onRequest(context) {
  const { request, env, params } = context;
  const artistId = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // First, get the artist's details
    const artist = await env.DB.prepare(`
      SELECT id, name, slug, genre, is_featured 
      FROM artists 
      WHERE id = ? AND deleted_at IS NULL AND status = 'published'
    `).bind(artistId).first();
    
    if (!artist) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Get other artists with same genre
    let similarArtists = [];
    let similarAlbums = [];
    let similarEps = [];
    let recommendedGenre = null;
    
    if (artist.genre && artist.genre.trim()) {
      recommendedGenre = artist.genre;
      
      // Similar artists
      const artistsResult = await env.DB.prepare(`
        SELECT 
          id, name, slug, image_url, genre, is_featured,
          (SELECT COUNT(*) FROM track_artists WHERE artist_id = a.id) as track_count
        FROM artists a
        WHERE deleted_at IS NULL 
          AND status = 'published'
          AND genre = ?
          AND id != ?
        ORDER BY is_featured DESC, track_count DESC
        LIMIT 6
      `).bind(artist.genre, artistId).all();
      similarArtists = artistsResult.results;
      
      // Albums with same genre
      const albumsResult = await env.DB.prepare(`
        SELECT 
          a.id, a.title, a.slug, a.cover_url, a.release_date, a.genre, a.plays,
          ar.name as artist_name,
          ar.slug as artist_slug,
          (SELECT COUNT(*) FROM album_tracks WHERE album_id = a.id) as track_count
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE a.deleted_at IS NULL 
          AND a.status = 'published'
          AND a.genre = ?
        ORDER BY a.plays DESC
        LIMIT 6
      `).bind(artist.genre).all();
      similarAlbums = albumsResult.results;
      
      // EPs with same genre
      const epsResult = await env.DB.prepare(`
        SELECT 
          e.id, e.title, e.slug, e.cover_url, e.release_date, e.genre, e.plays,
          ar.name as artist_name,
          ar.slug as artist_slug,
          (SELECT COUNT(*) FROM ep_tracks WHERE ep_id = e.id) as track_count
        FROM eps e
        LEFT JOIN artists ar ON e.artist_id = ar.id
        WHERE e.deleted_at IS NULL 
          AND e.status = 'published'
          AND e.genre = ?
        ORDER BY e.plays DESC
        LIMIT 6
      `).bind(artist.genre).all();
      similarEps = epsResult.results;
    } else {
      // If artist has no genre, get trending content instead
      const trendingAlbums = await env.DB.prepare(`
        SELECT 
          a.id, a.title, a.slug, a.cover_url, a.release_date, a.genre, a.plays,
          ar.name as artist_name
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE a.deleted_at IS NULL AND a.status = 'published'
        ORDER BY a.plays DESC
        LIMIT 6
      `).all();
      similarAlbums = trendingAlbums.results;
    }
    
    return new Response(JSON.stringify({
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        genre: artist.genre
      },
      genre: recommendedGenre,
      recommendations: {
        artists: similarArtists,
        albums: similarAlbums,
        eps: similarEps
      }
    }), { headers });
    
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}