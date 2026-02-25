export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // First, verify this artist exists by checking the API
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/artist/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await env.ASSETS.fetch(apiReq);
    
    // If artist not found, return 404
    if (!apiResponse.ok) {
      return new Response('Artist not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Get the artist.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    const htmlText = await htmlResponse.text();
    
    // Inject the slug into the page so our frontend JavaScript can use it
    const modifiedHtml = htmlText.replace(
      '<div id="content"',
      `<div id="content" data-artist-slug="${slug}"`
    );
    
    return new Response(modifiedHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving artist page:', error);
    return new Response('Error loading artist', { status: 500 });
  }
}