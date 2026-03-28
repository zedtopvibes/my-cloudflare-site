export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET - List all EPs (ADMIN - shows all including drafts)
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.cover_url,
          e.release_date,
          e.genre,
          e.label,
          e.plays,
          e.downloads,
          e.views,
          e.slug,
          e.is_featured,
          e.created_at,
          e.updated_at,
          e.artist_id,
          e.status,
          a.name as artist_name,
          a.slug as artist_slug
        FROM eps e
        LEFT JOIN artists a ON e.artist_id = a.id
        WHERE e.deleted_at IS NULL
        ORDER BY e.created_at DESC
      `).all();
      
      const processedResults = results.map(ep => ({
        ...ep,
        artist: ep.artist_name || 'Unknown Artist'
      }));
      
      return new Response(JSON.stringify(processedResults), { headers });
    } catch (error) {
      console.error('Error fetching EPs:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // POST - Create new EP with status and genre support
  if (request.method === 'POST') {
    try {
      const data = await request.json();
      
      if (!data.title || !data.artist_id) {
        return new Response(JSON.stringify({ 
          error: 'Title and artist_id are required' 
        }), { 
          status: 400, 
          headers 
        });
      }
      
      const status = data.status || 'draft';
      const genre = data.genre || null;
      
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
      
      const slug = data.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      const result = await env.DB.prepare(`
        INSERT INTO eps (
          title, 
          artist_id,
          description, 
          release_date, 
          genre, 
          label, 
          is_featured, 
          slug, 
          cover_url,
          status,
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `).bind(
        data.title,
        data.artist_id,
        data.description || null,
        data.release_date || null,
        genre,
        data.label || null,
        data.is_featured || 0,
        slug,
        data.cover_url || null,
        status
      ).run();

      const newEP = await env.DB.prepare(`
        SELECT 
          e.id,
          e.title,
          e.description,
          e.cover_url,
          e.release_date,
          e.genre,
          e.label,
          e.plays,
          e.downloads,
          e.views,
          e.slug,
          e.is_featured,
          e.created_at,
          e.updated_at,
          e.artist_id,
          e.status,
          a.name as artist_name,
          a.slug as artist_slug
        FROM eps e
        LEFT JOIN artists a ON e.artist_id = a.id
        WHERE e.id = ?
      `).bind(result.results[0].id).first();

      const epData = {
        ...newEP,
        artist: newEP.artist_name || 'Unknown Artist'
      };

      return new Response(JSON.stringify(epData), { 
        status: 201,
        headers 
      });

    } catch (error) {
      console.error('Error creating EP:', error);
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