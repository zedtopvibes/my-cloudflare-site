export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    let filename = params.filename;
    
    console.log('📸 Serving image request:', filename);

    // List of possible paths to try
    const pathsToTry = [
      filename,                                   // as-is
      `artists/${filename}`,                      // with artists/ prefix
      filename.replace('artists/', ''),           // without artists/ prefix
      filename.replace('/images/artists/', ''),   // clean old format
      `artists/${filename.split('/').pop()}`,     // just the filename part
    ];

    // Remove duplicates
    const uniquePaths = [...new Set(pathsToTry)];
    
    console.log('🔍 Trying paths:', uniquePaths);

    let object = null;
    let usedPath = null;

    // Try each path
    for (const path of uniquePaths) {
      try {
        object = await env.AUDIO.get(path);
        if (object) {
          usedPath = path;
          console.log('✅ Found image at:', usedPath);
          break;
        }
      } catch (e) {
        // Ignore errors, try next path
      }
    }

    if (!object) {
      console.log('❌ Image not found for:', filename);
      
      // Return a default placeholder or 404
      return new Response('Image not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      }
    });

  } catch (error) {
    console.error('❌ Error serving image:', error);
    return new Response('Error loading image: ' + error.message, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}