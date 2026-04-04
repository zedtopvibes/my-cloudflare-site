export async function onRequest(context) {
  const { request, env, params } = context;
  const compilationId = params.id;
  const itemId = params.itemId;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // First verify the compilation exists
    const compilation = await env.DB.prepare(`
      SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL
    `).bind(compilationId).first();
    
    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Delete the item
    const result = await env.DB.prepare(`
      DELETE FROM compilation_items 
      WHERE id = ? AND compilation_id = ?
    `).bind(itemId, compilationId).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Item not found in this compilation' }), { 
        status: 404, 
        headers 
      });
    }
    
    // Reorder remaining items to have sequential display_order
    const remainingItems = await env.DB.prepare(`
      SELECT id FROM compilation_items 
      WHERE compilation_id = ? 
      ORDER BY display_order ASC
    `).bind(compilationId).all();
    
    for (let i = 0; i < remainingItems.results.length; i++) {
      await env.DB.prepare(`
        UPDATE compilation_items SET display_order = ? WHERE id = ?
      `).bind(i, remainingItems.results[i].id).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers });
    
  } catch (error) {
    console.error('Error removing item:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}