export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'audio/mpeg',
  };

  // Handle OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const key = params.key;
    
    // Get the file from R2
    const object = await env.AUDIO.get(key);

    if (!object) {
      return new Response('Audio not found', { status: 404 });
    }

    // Return the file with proper headers
    return new Response(object.body, {
      headers: {
        ...headers,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Stream error:', error);
    return new Response('Streaming failed', { status: 500 });
  }
}