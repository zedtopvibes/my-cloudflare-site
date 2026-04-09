export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }
  
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit')) || 12;
    
    let query = `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.type,
        c.slug,
        c.cover_url,
        c.is_featured,
        c.views,
        c.created_at,
        (SELECT COUNT(*) FROM compilation_items WHERE compilation_id = c.id) as item_count
      FROM compilations c
      WHERE c.status = 'published' AND c.deleted_at IS NULL
    `;
    
    const params = [];
    
    if (type) {
      query += ` AND c.type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY c.is_featured DESC, c.created_at DESC LIMIT ?`;
    params.push(limit);
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching compilations:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}