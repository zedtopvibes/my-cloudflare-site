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
      if (data.artist !== undefined) {
        updates.push('artist = ?');
        values.push(data.artist);
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
        values.push(data.is_featured);
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

      const updated = await env.DB.prepare(
        'SELECT * FROM eps WHERE id = ?'
      ).bind(id).first();

      return new Response(JSON.stringify(updated), { headers });

    } catch (error) {
      console.error('Error updating EP:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Delete EP
  if (request.method === 'DELETE') {
    try {
      const result = await env.DB.prepare(
        'DELETE FROM eps WHERE id = ?'
      ).bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), { headers });

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