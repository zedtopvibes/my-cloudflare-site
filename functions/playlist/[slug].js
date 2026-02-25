export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // First, verify this playlist exists
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/playlist/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    // If playlist not found, return 404
    if (!apiResponse.ok) {
      return new Response('Playlist not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Get the playlist.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/playlist.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug into the page
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-playlist-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving playlist page:', error);
    return new Response('Error loading playlist', { status: 500 });
  }
}