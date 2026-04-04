export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // ONLY allow DELETE
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use DELETE',
      allowed: ['DELETE', 'OPTIONS']
    }), { status: 405, headers });
  }

  try {
    // Get IDs from URL params
    const compilationId = params.id;
    const itemId = params.itemId;
    
    console.log('🗑️ Removing compilation item:', { compilationId, itemId });

    if (!compilationId || !itemId) {
      return new Response(JSON.stringify({ 
        error: 'Missing compilation ID or item ID',
        params: params
      }), { status: 400, headers });
    }

    // Check if the compilation exists
    const compilation = await env.DB.prepare(
      'SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL'
    ).bind(compilationId).first();

    if (!compilation) {
      return new Response(JSON.stringify({ 
        error: 'Compilation not found'
      }), { status: 404, headers });
    }

    // Check if the relationship exists in compilation_items table
    const exists = await env.DB.prepare(
      'SELECT * FROM compilation_items WHERE compilation_id = ? AND id = ?'
    ).bind(compilationId, itemId).first();

    if (!exists) {
      return new Response(JSON.stringify({ 
        error: 'Item not found in this compilation'
      }), { status: 404, headers });
    }

    // Delete the relationship
    await env.DB.prepare(
      'DELETE FROM compilation_items WHERE compilation_id = ? AND id = ?'
    ).bind(compilationId, itemId).run();

    // Reorder remaining items
    const remaining = await env.DB.prepare(
      'SELECT id FROM compilation_items WHERE compilation_id = ? ORDER BY display_order'
    ).bind(compilationId).all();

    for (let i = 0; i < remaining.results.length; i++) {
      await env.DB.prepare(
        'UPDATE compilation_items SET display_order = ? WHERE compilation_id = ? AND id = ?'
      ).bind(i + 1, compilationId, remaining.results[i].id).run();
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Item removed from compilation successfully'
    }), { headers });

  } catch (error) {
    console.error('❌ Error removing item:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { status: 500, headers });
  }
}