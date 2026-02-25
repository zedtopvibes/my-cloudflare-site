export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Convert slug to artist name with proper spacing
    const baseName = slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Try both with and without trailing space
    const artistName = baseName + ' '; // Add trailing space
    
    // Redirect to the working URL format (with double encoding)
    const redirectUrl = '/artist?name=' + encodeURIComponent(encodeURIComponent(artistName));
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl }
    });
    
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}