export async function onRequest(context) {
  const { request, env, params } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Content-Type': 'audio/mpeg',
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  }

  try {
    const key = params.key;
    
    // Decode the key (it was encoded in the URL)
    const decodedKey = decodeURIComponent(key);
    
    console.log('Fetching from R2:', decodedKey);

    // Get the file from R2
    const object = await env.AUDIO.get(decodedKey);

    if (!object) {
      console.error('File not found in R2:', decodedKey);
      return new Response('Audio not found', { 
        status: 404,
        headers: { ...headers, 'Content-Type': 'text/plain' }
      });
    }

    // Get the file as a stream
    const fileBody = await object.arrayBuffer();
    
    // Return the file with proper headers
    return new Response(fileBody, {
      headers: {
        ...headers,
        'Content-Length': fileBody.byteLength,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Stream error:', error);
    return new Response('Streaming failed: ' + error.message, { 
      status: 500,
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  }
}