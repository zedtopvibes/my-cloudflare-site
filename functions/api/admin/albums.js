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

  // GET - List all albums with artist info
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.cover_url,
          a.release_date,
          a.genre,
          a.label,
          a.plays,
          a.downloads,
          a.views,
          a.slug,
          a.is_featured,
          a.created_at,
          a.updated_at,
          a.artist_id,
          ar.name as artist_name,
          ar.slug as artist_slug
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        ORDER BY a.created_at DESC
      `).all();
      
      // Process results to add backward compatibility fields
      const processedResults = results.map(album => ({
        ...album,
        artist: album.artist_name || 'Unknown Artist'
      }));
      
      return new Response(JSON.stringify(processedResults), { headers });
    } catch (error) {
      console.error('Error fetching albums:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new album
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      
      // Validate required fields
      if (!data.title || !data.artist_id) {
        return new Response(JSON.stringify({ 
          error: 'Title and artist_id are required' 
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Verify artist exists
      const artist = await env.DB.prepare(`
        SELECT id FROM artists WHERE id = ?
      `).bind(data.artist_id).first();
      
      if (!artist) {
        return new Response(JSON.stringify({ 
          error: 'Artist not found' 
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Generate slug from title
      const slug = data.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await env.DB.prepare(`
        INSERT INTO albums (
          title, 
          artist_id,
          description, 
          release_date, 
          genre, 
          label, 
          is_featured, 
          slug, 
          cover_url,
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        data.title,
        data.artist_id,
        data.description || null,
        data.release_date || null,
        data.genre || null,
        data.label || null,
        data.is_featured || 0,
        slug,
        data.cover_url || null
      ).run();

      const newAlbum = await env.DB.prepare(`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.cover_url,
          a.release_date,
          a.genre,
          a.label,
          a.plays,
          a.downloads,
          a.views,
          a.slug,
          a.is_featured,
          a.created_at,
          a.updated_at,
          a.artist_id,
          ar.name as artist_name,
          ar.slug as artist_slug
        FROM albums a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        WHERE a.id = ?
      `).bind(result.results[0].id).first();

      // Add backward compatibility field
      const albumData = {
        ...newAlbum,
        artist: newAlbum.artist_name || 'Unknown Artist'
      };

      return new Response(JSON.stringify(albumData), { 
        status: 201,
        headers 
      });

    } catch (error) {
      console.error('Error creating album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Update album (handled in [id].js)
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, 
    headers 
  });
}
