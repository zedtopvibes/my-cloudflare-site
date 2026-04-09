export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'PUT') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const { sections } = await request.json();
    
    for (const section of sections) {
      await env.DB.prepare(`
        UPDATE homepage_sections SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(section.display_order, section.id).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers });
    
  } catch (error) {
    console.error('Error reordering sections:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}