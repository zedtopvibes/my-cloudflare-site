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
    console.log('Updating track ID:', id);
    
    // Parse request body
    const updates = await request.json();
    console.log('Update data received:', updates);
    
    // Check if track exists first
    const existing = await env.DB.prepare(
      'SELECT id FROM tracks WHERE id = ?'
    ).bind(id).first();
    
    if (!existing) {
      console.log('Track not found:', id);
      return new Response(JSON.stringify({ error: 'Track not found' }), { 
        status: 404, 
        headers 
      });
    }
    
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
        // Convert boolean to integer for SQLite
        let value = updates[field];
        if (typeof value === 'boolean') {
          value = value ? 1 : 0;
        }
        values.push(value);
        console.log(`Setting ${field} =`, value);
      }
    });
    
    if (fields.length === 0) {
      console.log('No fields to update');
      return new Response(JSON.stringify({ error: 'No fields to update' }), { 
        status: 400, 
        headers 
      });
    }
    
    // Add id to values array
    values.push(id);
    
    // Execute update
    const query = `UPDATE tracks SET ${fields.join(', ')} WHERE id = ?`;
    console.log('Executing query:', query);
    console.log('With values:', values);
    
    const result = await env.DB.prepare(query).bind(...values).run();
    console.log('Update result:', result);
    
    // Fetch updated track
    const updated = await env.DB.prepare(
      'SELECT * FROM tracks WHERE id = ?'
    ).bind(id).first();
    
    console.log('Updated track:', updated);
    
    return new Response(JSON.stringify({
      success: true,
      track: updated
    }), { headers });
    
  } catch (error) {
    console.error('❌ Error updating track:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500, 
      headers 
    });
  }
}