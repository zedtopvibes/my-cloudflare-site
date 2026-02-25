export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Convert slug to artist name (e.g., "ice-spice" → "Ice Spice")
    const artistName = slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Encode exactly once for the working format
    const encodedName = encodeURIComponent(artistName);
    
    // Redirect to the working URL
    const redirectUrl = `/artist?name=${encodedName}`;
    
    return new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl }
    });
    
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}