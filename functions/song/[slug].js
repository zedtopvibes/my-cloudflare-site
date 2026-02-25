export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // First, verify this track exists
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/song/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    // If track not found, return 404
    if (!apiResponse.ok) {
      return new Response('Track not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Get the song.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/song.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug into the page
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-song-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving song page:', error);
    return new Response('Error loading song', { status: 500 });
  }
}