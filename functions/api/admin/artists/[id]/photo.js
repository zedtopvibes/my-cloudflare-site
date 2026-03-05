export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    // The filename from the URL might include 'artists/' prefix
    let filename = params.filename;
    
    console.log('Serving image:', filename);

    // If the filename doesn't start with 'artists/', add it
    // This handles both old and new URLs
    if (!filename.startsWith('artists/')) {
      filename = `artists/${filename}`;
    }
    
    // Get the image from R2
    const object = await env.AUDIO.get(filename);
    
    if (!object) {
      console.log('Image not found:', filename);
      
      // Try without the artists/ prefix as fallback
      if (filename.startsWith('artists/')) {
        const fallbackFilename = filename.replace('artists/', '');
        const fallbackObject = await env.AUDIO.get(fallbackFilename);
        
        if (fallbackObject) {
          console.log('Found with fallback:', fallbackFilename);
          const contentType = fallbackObject.httpMetadata?.contentType || 
                             (fallbackFilename.endsWith('.png') ? 'image/png' : 
                              fallbackFilename.endsWith('.jpg') || fallbackFilename.endsWith('.jpeg') ? 'image/jpeg' : 
                              fallbackFilename.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
          
          return new Response(fallbackObject.body, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
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
    console.error('Error serving image:', error);
    return new Response('Error loading image: ' + error.message, { status: 500 });
  }
}