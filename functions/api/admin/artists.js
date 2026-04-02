export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET - List all artists with track/album/ep counts (ADMIN - shows all including drafts)
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          a.id, 
          a.name, 
          a.slug, 
          a.image_url, 
          a.photo_url,
          a.bio, 
          a.country, 
          a.genre, 
          a.views, 
          a.is_featured, 
          a.is_zambian_legend, 
          a.status, 
          a.created_at,
          a.updated_at,
          -- Count tracks (all tracks regardless of status)
          (SELECT COUNT(DISTINCT ta.track_id) 
           FROM track_artists ta 
           WHERE ta.artist_id = a.id) as track_count,
          -- Count albums
          (SELECT COUNT(*) 
           FROM albums al 
           WHERE al.artist_id = a.id 
           AND al.deleted_at IS NULL) as album_count,
          -- Count EPs
          (SELECT COUNT(*) 
           FROM eps e 
           WHERE e.artist_id = a.id 
           AND e.deleted_at IS NULL) as ep_count
        FROM artists a 
        WHERE a.deleted_at IS NULL 
        ORDER BY a.created_at DESC
      `).all();
      
      // Process results to ensure counts are numbers
      const artists = results.map(artist => ({
        ...artist,
        track_count: parseInt(artist.track_count) || 0,
        album_count: parseInt(artist.album_count) || 0,
        ep_count: parseInt(artist.ep_count) || 0,
        is_featured: artist.is_featured === 1,
        is_zambian_legend: artist.is_zambian_legend === 1
      }));
      
      return new Response(JSON.stringify(artists), { headers });
      
    } catch (error) {
      console.error('Error fetching artists:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new artist with status support
  if (request.method === 'POST') {
    try {
      const { name, country, genre, bio, is_featured, is_zambian_legend, status } = await request.json();
      
      if (!name) {
        return new Response(JSON.stringify({ error: 'Artist name is required' }), { 
          status: 400, 
          headers 
        });
      }

      // Get status from request (default to draft)
      const artistStatus = status || 'draft';

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if artist already exists
      const existing = await env.DB.prepare(
        'SELECT id FROM artists WHERE name = ? OR slug = ? AND deleted_at IS NULL'
      ).bind(name, slug).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: 'Artist with this name already exists' 
        }), { status: 400, headers });
      }

      // Insert new artist
      const result = await env.DB.prepare(`
        INSERT INTO artists (name, slug, country, genre, bio, is_featured, is_zambian_legend, status, views, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        name, 
        slug, 
        country || null,
        genre || null,
        bio || null, 
        is_featured ? 1 : 0, 
        is_zambian_legend ? 1 : 0,
        artistStatus
      ).run();

      const newArtist = await env.DB.prepare(`
        SELECT 
          id, 
          name, 
          slug, 
          image_url, 
          photo_url,
          bio, 
          country, 
          genre, 
          views, 
          is_featured, 
          is_zambian_legend, 
          status, 
          created_at,
          0 as track_count,
          0 as album_count,
          0 as ep_count
        FROM artists WHERE id = ?
      `).bind(result.results[0].id).first();

      return new Response(JSON.stringify(newArtist), { 
        status: 201, 
        headers 
      });

    } catch (error) {
      console.error('Error creating artist:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}