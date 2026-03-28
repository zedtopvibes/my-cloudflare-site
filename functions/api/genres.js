export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Get unique genres from artists
    const artistGenres = await env.DB.prepare(`
      SELECT DISTINCT genre FROM artists 
      WHERE deleted_at IS NULL 
        AND status = 'published'
        AND genre IS NOT NULL 
        AND genre != ''
    `).all();
    
    // Get unique genres from albums
    const albumGenres = await env.DB.prepare(`
      SELECT DISTINCT genre FROM albums 
      WHERE deleted_at IS NULL 
        AND status = 'published'
        AND genre IS NOT NULL 
        AND genre != ''
    `).all();
    
    // Get unique genres from eps
    const epGenres = await env.DB.prepare(`
      SELECT DISTINCT genre FROM eps 
      WHERE deleted_at IS NULL 
        AND status = 'published'
        AND genre IS NOT NULL 
        AND genre != ''
    `).all();
    
    // Combine and deduplicate
    const allGenres = new Set();
    artistGenres.results.forEach(g => { if (g.genre) allGenres.add(g.genre); });
    albumGenres.results.forEach(g => { if (g.genre) allGenres.add(g.genre); });
    epGenres.results.forEach(g => { if (g.genre) allGenres.add(g.genre); });
    
    const genres = Array.from(allGenres).sort();
    
    // Get counts for each genre
    const genresWithCounts = await Promise.all(genres.map(async (genre) => {
      const artistCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM artists 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first();
      
      const albumCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM albums 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first();
      
      const epCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM eps 
        WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
      `).bind(genre).first();
      
      return {
        name: genre,
        slug: genre.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
        artists: artistCount?.count || 0,
        albums: albumCount?.count || 0,
        eps: epCount?.count || 0,
        total: (artistCount?.count || 0) + (albumCount?.count || 0) + (epCount?.count || 0)
      };
    }));
    
    // Sort by total count
    genresWithCounts.sort((a, b) => b.total - a.total);
    
    return new Response(JSON.stringify(genresWithCounts), { headers });
    
  } catch (error) {
    console.error('Error fetching genres:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}