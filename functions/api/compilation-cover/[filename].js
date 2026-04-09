export async function onRequest(context) {
  const { request, env, params } = context;
  const filename = params.filename;
  
  try {
    // Look for file in compilations folder
    const object = await env.AUDIO.get(`compilations/${filename}`);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Determine content type
    const contentType = object.httpMetadata?.contentType || 
                       (filename.endsWith('.png') ? 'image/png' : 
                        filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 
                        filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Error loading image', { status: 500 });
  }
}