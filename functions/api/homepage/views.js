export async function onRequest(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  // Allow both GET and POST
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, headers 
    });
  }

  try {
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
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers 
    });
  }
}