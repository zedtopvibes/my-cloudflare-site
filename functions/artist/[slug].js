export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/artist/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    if (!apiResponse.ok) {
      return new Response('Artist not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const artist = await apiResponse.json();
    
    // Increment views
    if (artist && artist.id) {
      env.DB.prepare(`
        UPDATE artists SET views = views + 1 WHERE id = ?
      `).bind(artist.id).run().catch(e => console.error('Error updating artist views:', e));
    }
    
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    let html = await htmlResponse.text();
    
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-artist-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving artist page:', error);
    return new Response('Error loading artist', { status: 500 });
  }
}