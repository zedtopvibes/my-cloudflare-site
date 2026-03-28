export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Check if the artist exists before serving the page
    const artist = await env.DB.prepare(`
      SELECT id, name, slug FROM artists 
      WHERE slug = ? AND deleted_at IS NULL AND status = 'published'
    `).bind(slug).first();
    
    if (!artist) {
      return new Response('Artist not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Increment views (don't await - run in background)
    env.DB.prepare(`
      UPDATE artists SET views = views + 1 WHERE id = ?
    `).bind(artist.id).run().catch(e => console.error('Error updating artist views:', e));
    
    // Fetch the artist.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug for the frontend to use directly
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