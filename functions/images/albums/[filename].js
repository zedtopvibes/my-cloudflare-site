export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const filename = params.filename;
    
    // Get the image from R2 (assuming they're stored in AUDIO bucket under "albums/")
    const object = await env.AUDIO.get(`albums/${filename}`);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }
    
    // Determine content type
    const contentType = object.httpMetadata?.contentType || 
                       (filename.endsWith('.png') ? 'image/png' : 
                        filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 
                        filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    
    // Return the image
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response('Error loading image', { status: 500 });
  }
}