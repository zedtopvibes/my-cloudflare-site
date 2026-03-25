export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const id = params.id;

  // PUT - Update album
  if (request.method === 'PUT') {
    try {
      const data = await request.json();
      
      // Check if album exists
      const existing = await env.DB.prepare(
        'SELECT id FROM albums WHERE id = ?'
      ).bind(id).first();
      
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Album not found' }), { 
          status: 404, 
          headers 
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        values.push(data.title);
      }
      
      // Handle artist_id instead of artist
      if (data.artist_id !== undefined) {
        // Verify artist exists
        const artist = await env.DB.prepare(`
          SELECT id FROM artists WHERE id = ?
        `).bind(data.artist_id).first();
        
        if (!artist) {
          return new Response(JSON.stringify({ error: 'Artist not found' }), { 
            status: 400, 
            headers 
          });
        }
        
        updates.push('artist_id = ?');
        values.push(data.artist_id);
      }
      
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }
      if (data.release_date !== undefined) {
        updates.push('release_date = ?');
        values.push(data.release_date);
      }
      if (data.genre !== undefined) {
        updates.push('genre = ?');
        values.push(data.genre);
      }
      if (data.label !== undefined) {
        updates.push('label = ?');
        values.push(data.label);
      }
      if (data.is_featured !== undefined) {
        updates.push('is_featured = ?');
        values.push(data.is_featured ? 1 : 0);
      }
      if (data.cover_url !== undefined) {
        updates.push('cover_url = ?');
        values.push(data.cover_url);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      
      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), { 
          status: 400, 
          headers 
        });
      }

      values.push(id);

      const query = `UPDATE albums SET ${updates.join(', ')} WHERE id = ?`;
      await env.DB.prepare(query).bind(...values).run();

      // Fetch updated album with artist info
      const updated = await env.DB.prepare(`
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
      `).bind(id).first();

      // Add backward compatibility field
      const albumData = {
        ...updated,
        artist: updated.artist_name || 'Unknown Artist'
      };

      return new Response(JSON.stringify(albumData), { headers });

    } catch (error) {
      console.error('Error updating album:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Delete album
  if (request.method === 'DELETE') {
    try {
      // First, delete associated tracks from album_tracks junction table
      await env.DB.prepare(
        'DELETE FROM album_tracks WHERE album_id = ?'
      ).bind(id).run();
      
      // Then delete the album
      await env.DB.prepare(
        'DELETE FROM albums WHERE id = ?'
      ).bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), { headers });

    } catch (error) {
      console.error('Error deleting album:', error);
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
