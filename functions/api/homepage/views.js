export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  // GET request = just return the count (don't increment)
  if (request.method === 'GET') {
    const result = await env.DB.prepare(`
      SELECT total_views FROM homepage_views WHERE id = 1
    `).first();
    
    return new Response(JSON.stringify({ 
      total_views: result?.total_views || 0 
    }), { headers });
  }

  // POST request = increment the count (real homepage view)
  if (request.method === 'POST') {
    const result = await env.DB.prepare(`
      UPDATE homepage_views 
      SET total_views = total_views + 1,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING total_views
    `).run();
    
    const totalViews = result.results[0]?.total_views || 0;
    
    return new Response(JSON.stringify({ 
      success: true, 
      total_views: totalViews 
    }), { headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
    status: 405, headers 
  });
}