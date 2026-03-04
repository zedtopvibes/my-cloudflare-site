export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow PUT
  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const id = params.id;
    
    // Parse request body
    const updates = await request.json();
    
    // Check if track exists
    const existing = await env.DB.prepare(
      'SELECT id FROM tracks WHERE id = ?'
    ).bind(id).first();
    
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Track not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Build dynamic UPDATE query - ONLY with columns that exist!
    const fields = [];
    const values = [];
    
    // These columns DO exist in your table
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    
    if (updates.genre !== undefined) {
      fields.push('genre = ?');
      values.push(updates.genre);
    }
    
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    
    if (updates.release_date !== undefined) {
      fields.push('release_date = ?');
      values.push(updates.release_date);
    }
    
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    
    if (updates.artwork_url !== undefined) {
      fields.push('artwork_url = ?');
      values.push(updates.artwork_url);
    }
    
    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { 
        status: 400, 
        headers 
      });
    }
    
    // Add id to values array
    values.push(id);
    
    // Execute update
    const query = `UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...values).run();
    
    // Fetch updated track
    const updated = await env.DB.prepare(
      'SELECT * FROM tracks WHERE id = ?'
    ).bind(id).first();
    
    return new Response(JSON.stringify({
      success: true,
      track: updated
    }), { headers });
    
  } catch (error) {
    console.error('Error updating track:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}