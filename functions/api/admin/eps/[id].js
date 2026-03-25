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

  // PUT - Update EP
  if (request.method === 'PUT') {
    try {
      const data = await request.json();
      
      // Check if EP exists
      const existing = await env.DB.prepare(
        'SELECT id FROM eps WHERE id = ?'
      ).bind(id).first();
      
      if (!existing) {
        return new Response(JSON.stringify({ error: 'EP not found' }), { 
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

      const query = `UPDATE eps SET ${updates.join(', ')} WHERE id = ?`;
      await env.DB.prepare(query).bind(...values).run();

      // Fetch updated EP with artist info
      const updated = await env.DB.prepare(`
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
          a.name as artist_name,
          a.slug as artist_slug
        FROM eps e
        LEFT JOIN artists a ON e.artist_id = a.id
        WHERE e.id = ?
      `).bind(id).first();

      // Add backward compatibility field
      const epData = {
        ...updated,
        artist: updated.artist_name || 'Unknown Artist'
      };

      return new Response(JSON.stringify(epData), { headers });

    } catch (error) {
      console.error('Error updating EP:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Delete EP with track count check
  if (request.method === 'DELETE') {
    try {
      // Check if EP exists
      const ep = await env.DB.prepare(
        'SELECT id FROM eps WHERE id = ?'
      ).bind(id).first();
      
      if (!ep) {
        return new Response(JSON.stringify({ error: 'EP not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      // Check if EP has any tracks in ep_tracks junction table
      const trackCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM ep_tracks WHERE ep_id = ?
      `).bind(id).first();
      
      if (trackCount.count > 0) {
        return new Response(JSON.stringify({ 
          error: `Cannot delete EP with ${trackCount.count} track(s). Remove all tracks first.`,
          track_count: trackCount.count
        }), { 
          status: 400, 
          headers 
        });
      }
      
      // Delete the EP (no tracks to clean up since we already checked)
      await env.DB.prepare(
        'DELETE FROM eps WHERE id = ?'
      ).bind(id).run();
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'EP deleted successfully'
      }), { headers });
      
    } catch (error) {
      console.error('Error deleting EP:', error);
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