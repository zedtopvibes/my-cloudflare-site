export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // First, verify this compilation exists and get its ID
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/compilation/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    // If compilation not found, return 404
    if (!apiResponse.ok) {
      return new Response('Compilation not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Get the compilation data to get its ID
    const compilation = await apiResponse.json();
    
    // Increment views asynchronously
    if (compilation && compilation.id) {
      env.DB.prepare(`
        UPDATE compilations SET views = views + 1 WHERE id = ?
      `).bind(compilation.id).run().catch(e => console.error('Error updating compilation views:', e));
    }
    
    // Get the compilation.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/compilation.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug into the page
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-compilation-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving compilation page:', error);
    return new Response('Error loading compilation', { status: 500 });
  }
}