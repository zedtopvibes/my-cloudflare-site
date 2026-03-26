export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const filename = params.filename;
    
    // Try different paths to find the image
    const pathsToTry = [
      `eps/${filename}`,
      filename,
      `eps/${filename.split('/').pop()}`
    ];

    let object = null;
    for (const path of pathsToTry) {
      object = await env.AUDIO.get(path);
      if (object) break;
    }

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Determine content type
    let contentType = object.httpMetadata?.contentType;
    if (!contentType) {
      if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filename.endsWith('.webp')) contentType = 'image/webp';
      else contentType = 'image/jpeg';
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error serving EP image:', error);
    return new Response('Error loading image', { status: 500 });
  }
}