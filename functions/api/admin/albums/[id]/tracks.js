export async function onRequest(context) {
  const { request, env, params } = context;
  
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
    return new Response(JSON.stringify({ error: 'Use DELETE' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const albumId = params.id;
    const trackId = params.trackId;
    
    // Just return what we received (for testing)
    return new Response(JSON.stringify({ 
      received: { albumId, trackId },
      message: 'DELETE endpoint working'
    }), { headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}