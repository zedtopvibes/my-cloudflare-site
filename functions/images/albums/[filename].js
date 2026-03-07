export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const filename = params.filename;
    console.log('Serving album image:', filename);

    // Try different path variations (just like artist-image endpoint)
    const pathsToTry = [
      `albums/${filename}`,           // albums/filename.jpg
      filename,                        // filename.jpg
      `albums/${filename.split('/').pop()}`, // just the filename part
    ];

    // Remove duplicates
    const uniquePaths = [...new Set(pathsToTry)];
    
    let object = null;
    let usedPath = null;

    // Try each path
    for (const path of uniquePaths) {
      object = await env.AUDIO.get(path);
      if (object) {
        usedPath = path;
        console.log('Found image at:', usedPath);
        break;
      }
    }

    if (!object) {
      console.log('Image not found for:', filename);
      return new Response('Image not found', { status: 404 });
    }

    // Determine content type
    let contentType = object.httpMetadata?.contentType;
    if (!contentType) {
      if (filename.endsWith('.png')) contentType = 'image/png';
      else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filename.endsWith('.webp')) contentType = 'image/webp';
      else if (filename.endsWith('.gif')) contentType = 'image/gif';
      else contentType = 'image/jpeg';
    }

    // Return the image
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error serving album image:', error);
    return new Response('Error loading image: ' + error.message, { status: 500 });
  }
}