export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Fetch the artist page HTML
    const htmlResponse = await env.ASSETS.fetch(new URL('/artist.html', request.url));
    let html = await htmlResponse.text();
    
    // Inject the slug as a query parameter by modifying the HTML
    // This adds a hidden redirect that will work with your existing page
    const script = `
      <script>
        (function() {
          // Check if we already have the artist name in URL
          const urlParams = new URLSearchParams(window.location.search);
          if (!urlParams.has('name') && '${slug}') {
            // Convert slug back to artist name (simple version)
            const artistName = '${slug}'.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            // Redirect to the working URL format
            window.location.href = '/artist?name=' + encodeURIComponent(artistName);
          }
        })();
      </script>
    `;
    
    // Insert the script right before </head>
    html = html.replace('</head>', script + '</head>');
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    return new Response('Error loading artist: ' + error.message, { status: 500 });
  }
}