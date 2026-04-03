export async function onRequest(context) {
  const { request, env, params } = context;
  const compilationId = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // POST - Add item to compilation
  if (request.method === 'POST') {
    try {
      const { item_id } = await request.json();
      
      if (!item_id) {
        return new Response(JSON.stringify({ error: 'item_id is required' }), { 
          status: 400, 
          headers 
        });
      }
      
      // Check if compilation exists
      const compilation = await env.DB.prepare(`
        SELECT id, type FROM compilations WHERE id = ? AND deleted_at IS NULL
      `).bind(compilationId).first();
      
      if (!compilation) {
        return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
          status: 404, 
          headers 
        });
      }
      
      // Check if item already exists
      const existing = await env.DB.prepare(`
        SELECT id FROM compilation_items 
        WHERE compilation_id = ? AND item_id = ?
      `).bind(compilationId, item_id).first();
      
      if (existing) {
        return new Response(JSON.stringify({ error: 'Item already in compilation' }), { 
          status: 400, 
          headers 
        });
      }
      
      // Get max display order
      const maxOrder = await env.DB.prepare(`
        SELECT MAX(display_order) as max_order FROM compilation_items WHERE compilation_id = ?
      `).bind(compilationId).first();
      
      const displayOrder = (maxOrder?.max_order || 0) + 1;
      
      const result = await env.DB.prepare(`
        INSERT INTO compilation_items (compilation_id, item_id, display_order)
        VALUES (?, ?, ?)
        RETURNING id
      `).bind(compilationId, item_id, displayOrder).run();
      
      return new Response(JSON.stringify({ 
        success: true, 
        id: result.results[0].id,
        display_order: displayOrder
      }), { status: 201, headers });
      
    } catch (error) {
      console.error('Error adding item:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // DELETE - Remove item from compilation
  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url);
      const itemId = url.searchParams.get('item_id');
      
      if (!itemId) {
        return new Response(JSON.stringify({ error: 'item_id is required' }), { 
          status: 400, 
          headers 
        });
      }
      
      await env.DB.prepare(`
        DELETE FROM compilation_items WHERE compilation_id = ? AND id = ?
      `).bind(compilationId, itemId).run();
      
      return new Response(JSON.stringify({ success: true }), { headers });
      
    } catch (error) {
      console.error('Error removing item:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers 
      });
    }
  }

  // PUT - Reorder items
  if (request.method === 'PUT') {
    try {
      const { items } = await request.json(); // [{id: 1, display_order: 0}, ...]
      
      for (const item of items) {
        await env.DB.prepare(`
          UPDATE compilation_items SET display_order = ? WHERE id = ? AND compilation_id = ?
        `).bind(item.display_order, item.id, compilationId).run();
      }
      
      return new Response(JSON.stringify({ success: true }), { headers });
      
    } catch (error) {
      console.error('Error reordering items:', error);
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