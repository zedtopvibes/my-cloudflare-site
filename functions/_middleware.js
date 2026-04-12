export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\//, '');
  
  // List of 14 paths to redirect
  const redirectPaths = [
    'playlists', 'albums', 'artists', 'tracks', 
    'genres', 'charts', 'radio', 'podcasts', 
    'favorites', 'history', 'following', 'liked', 
    'recent', 'stats', 'settings'
  ];
  
  // If the path matches, redirect to homepage
  if (redirectPaths.includes(path)) {
    return Response.redirect('/', 301);
  }
  
  // Otherwise, proceed normally (your admin Functions still work)
  return context.next();
}