export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // First, check if this is a valid artist by calling the API
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/artist/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    // If artist doesn't exist, return 404
    if (!apiResponse.ok) {
      return new Response('Artist not found', { status: 404 });
    }
    
    // Get the artist page HTML
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the artist name as a query parameter (for backward compatibility)
    const artistData = await apiResponse.json();
    const artistName = encodeURIComponent(artistData.name);
    
    // Modify the HTML to redirect to the working page
    // This is a temporary solution - we'll update the HTML later to use slugs directly
    html = html.replace(
      '<body>',
      `<body><script>window.ARTIST_SLUG = '${slug}'; window.ARTIST_NAME = '${artistData.name}';</script>`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    return new Response('Error loading artist', { status: 500 });
  }
}