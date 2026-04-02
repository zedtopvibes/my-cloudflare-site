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

  // GET - List all artists (ADMIN - shows all including drafts)
  if (request.method === 'GET') {
    try {
      // First get all artists
      const { results: artists } = await env.DB.prepare(`
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
          updated_at
        FROM artists 
        WHERE deleted_at IS NULL 
        ORDER BY created_at DESC
      `).all();
      
      // For each artist, get their counts
      const artistsWithCounts = await Promise.all(artists.map(async (artist) => {
        // Get track count
        const trackResult = await env.DB.prepare(`
          SELECT COUNT(DISTINCT ta.track_id) as count
          FROM track_artists ta
          WHERE ta.artist_id = ?
        `).bind(artist.id).first();
        
        // Get album count
        const albumResult = await env.DB.prepare(`
          SELECT COUNT(*) as count
          FROM albums al
          WHERE al.artist_id = ? AND al.deleted_at IS NULL
        `).bind(artist.id).first();
        
        // Get EP count
        const epResult = await env.DB.prepare(`
          SELECT COUNT(*) as count
          FROM eps e
          WHERE e.artist_id = ? AND e.deleted_at IS NULL
        `).bind(artist.id).first();
        
        return {
          ...artist,
          track_count: parseInt(trackResult?.count) || 0,
          album_count: parseInt(albumResult?.count) || 0,
          ep_count: parseInt(epResult?.count) || 0,
          is_featured: artist.is_featured === 1,
          is_zambian_legend: artist.is_zambian_legend === 1
        };
      }));
      
      return new Response(JSON.stringify(artistsWithCounts), { headers });
      
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
      const { name, country, genre, bio, is_featured, is_zambian_legend, status, photo_url, image_url } = await request.json();
      
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
        'SELECT id FROM artists WHERE name = ? AND deleted_at IS NULL'
      ).bind(name).first();

      if (existing) {
        return new Response(JSON.stringify({ 
          error: 'Artist with this name already exists' 
        }), { status: 400, headers });
      }

      // Insert new artist
      const result = await env.DB.prepare(`
        INSERT INTO artists (name, slug, country, genre, bio, is_featured, is_zambian_legend, status, views, photo_url, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        name, 
        slug, 
        country || null,
        genre || null,
        bio || null, 
        is_featured ? 1 : 0, 
        is_zambian_legend ? 1 : 0,
        artistStatus,
        photo_url || null,
        image_url || null
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

      return new Response(JSON.stringify({
        ...newArtist,
        is_featured: newArtist.is_featured === 1,
        is_zambian_legend: newArtist.is_zambian_legend === 1
      }), { 
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

  // PUT - Update artist
  if (request.method === 'PUT') {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'Artist ID is required' }), { 
          status: 400, 
          headers 
        });
      }
      
      const { name, country, genre, bio, is_featured, is_zambian_legend, status, photo_url, image_url } = await request.json();
      
      // Update artist
      await env.DB.prepare(`
        UPDATE artists 
        SET name = COALESCE(?, name),
            country = COALESCE(?, country),
            genre = COALESCE(?, genre),
            bio = COALESCE(?, bio),
            is_featured = COALESCE(?, is_featured),
            is_zambian_legend = COALESCE(?, is_zambian_legend),
            status = COALESCE(?, status),
            photo_url = COALESCE(?, photo_url),
            image_url = COALESCE(?, image_url),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `).bind(
        name || null,
        country || null,
        genre || null,
        bio || null,
        is_featured !== undefined ? (is_featured ? 1 : 0) : null,
        is_zambian_legend !== undefined ? (is_zambian_legend ? 1 : 0) : null,
        status || null,
        photo_url || null,
        image_url || null,
        id
      ).run();
      
      // Get updated artist
      const updatedArtist = await env.DB.prepare(`
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
          updated_at
        FROM artists WHERE id = ? AND deleted_at IS NULL
      `).bind(id).first();
      
      // Get counts
      const trackResult = await env.DB.prepare(`
        SELECT COUNT(DISTINCT ta.track_id) as count
        FROM track_artists ta
        WHERE ta.artist_id = ?
      `).bind(id).first();
      
      const albumResult = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM albums al
        WHERE al.artist_id = ? AND al.deleted_at IS NULL
      `).bind(id).first();
      
      const epResult = await env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM eps e
        WHERE e.artist_id = ? AND e.deleted_at IS NULL
      `).bind(id).first();
      
      return new Response(JSON.stringify({
        ...updatedArtist,
        track_count: parseInt(trackResult?.count) || 0,
        album_count: parseInt(albumResult?.count) || 0,
        ep_count: parseInt(epResult?.count) || 0,
        is_featured: updatedArtist.is_featured === 1,
        is_zambian_legend: updatedArtist.is_zambian_legend === 1
      }), { headers });
      
    } catch (error) {
      console.error('Error updating artist:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Soft delete artist
  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'Artist ID is required' }), { 
          status: 400, 
          headers 
        });
      }
      
      await env.DB.prepare(`
        UPDATE artists 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), { headers });
      
    } catch (error) {
      console.error('Error deleting artist:', error);
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