export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Handle POST request (add new artist)
  if (request.method === 'POST') {
    try {
      const { name, country } = await request.json();
      
      if (!name) {
        return new Response(JSON.stringify({ error: 'Artist name is required' }), { 
          status: 400, 
          headers 
        });
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Insert into artists table (if you have one)
      // If you don't have artists table, you might want to create one first
      
      // For now, we'll just return success with the generated data
      return new Response(JSON.stringify({ 
        success: true,
        id: Date.now(), // temporary ID
        name: name,
        slug: slug,
        country: country || null
      }), { headers });

    } catch (error) {
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