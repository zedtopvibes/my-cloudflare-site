export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Fetch the artist.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug for the frontend to use directly
    // This replaces the loading div with one that has the slug
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-artist-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    return new Response('Error loading artist', { status: 500 });
  }
}