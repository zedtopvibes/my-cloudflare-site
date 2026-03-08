export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const filename = params.filename;
    
    const object = await env.AUDIO.get(`covers/${filename}`);
    
    if (!object) {
      return new Response('Cover not found', { status: 404 });
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    return new Response('Error loading cover', { status: 500 });
  }
}