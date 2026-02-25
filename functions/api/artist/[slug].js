export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Fetch the artist.html template
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    const htmlText = await htmlResponse.text();
    
    // Inject the slug into the page
    const modifiedHtml = htmlText.replace(
      '<div id="content"',
      `<div id="content" data-artist-slug="${slug}"`
    );
    
    return new Response(modifiedHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    return new Response('Error loading artist page', { status: 500 });
  }
}