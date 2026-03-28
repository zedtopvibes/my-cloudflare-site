export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/album/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    if (!apiResponse.ok) {
      return new Response('Album not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const album = await apiResponse.json();
    
    // Increment views
    if (album && album.id) {
      env.DB.prepare(`
        UPDATE albums SET views = views + 1 WHERE id = ?
      `).bind(album.id).run().catch(e => console.error('Error updating album views:', e));
    }
    
    const htmlResponse = await env.ASSETS.fetch(new URL('/album.html', request.url));
    let html = await htmlResponse.text();
    
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-album-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving album page:', error);
    return new Response('Error loading album', { status: 500 });
  }
}