export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/ep/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    if (!apiResponse.ok) {
      return new Response('EP not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const ep = await apiResponse.json();
    
    // Increment views
    if (ep && ep.id) {
      env.DB.prepare(`
        UPDATE eps SET views = views + 1 WHERE id = ?
      `).bind(ep.id).run().catch(e => console.error('Error updating EP views:', e));
    }
    
    const htmlResponse = await env.ASSETS.fetch(new URL('/ep.html', request.url));
    let html = await htmlResponse.text();
    
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-ep-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving EP page:', error);
    return new Response('Error loading EP', { status: 500 });
  }
}