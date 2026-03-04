export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (CORS preflight)
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
    
    // Build dynamic UPDATE query
    const fields = [];
    const values = [];
    
    // List of allowed fields to update
    const allowedFields = [
      'title', 'genre', 'duration', 'bpm', 
      'release_date', 'description', 
      'explicit', 'featured', 'editor_pick'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    });
    
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