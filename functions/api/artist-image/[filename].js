export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const filename = params.filename;
    
    // Get the image from R2
    const object = await env.AUDIO.get(filename);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }
    
    // Return the image
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
    
  } catch (error) {
    return new Response('Error loading image', { status: 500 });
  }
}