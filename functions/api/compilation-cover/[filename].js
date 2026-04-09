export async function onRequest(context) {
  const { request, env, params } = context;
  const filename = params.filename;
  
  try {
    // Try different path variations
    const paths = [
      `compilations/${filename}`,
      filename,
      `compilations/${filename.split('/').pop()}`
    ];

    let object = null;

    for (const path of paths) {
      object = await env.AUDIO.get(path);
      if (object) {
        break;
      }
    }

    if (!object) {
      return new Response('Cover not found', { status: 404 });
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
    console.error('Error serving cover:', error);
    return new Response('Error loading cover', { status: 500 });
  }
}