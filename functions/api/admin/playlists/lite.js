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
    const search = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit')) || 100;
    
    let query = `
      SELECT 
        id,
        name,
        cover_url,
        created_by
      FROM playlists
      WHERE deleted_at IS NULL
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const { results } = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify(results), { headers });
    
  } catch (error) {
    console.error('Error fetching playlists lite:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}