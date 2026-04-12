export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Don't redirect admin paths
  if (url.pathname.startsWith('/admin')) {
    return context.next();
  }
  
  // List of paths to redirect
  const redirectPaths = [
    '/playlists', '/albums', '/artists', '/tracks', 
    '/genres', '/charts', '/radio', '/podcasts', 
    '/favorites', '/history', '/following', '/liked', 
    '/recent', '/stats', '/settings'
  ];
  
  if (redirectPaths.includes(url.pathname)) {
    return Response.redirect('/', 301);
  }
  
  return context.next();
}