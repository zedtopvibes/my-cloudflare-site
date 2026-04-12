export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  const redirectPaths = new Set([
    '/album', '/albums', '/artist', '/artists',
    '/compilation', '/ep', '/genre', '/page',
    '/playlist', '/playlists', '/song',
    '/test-css', '/test-shared'
  ]);
  
  if (redirectPaths.has(pathname)) {
    // 302 = Found (Temporal Redirect)
    return Response.redirect(new URL('/', url.origin).toString(), 302);
  }
  
  try {
    return await context.next();
  } catch (error) {
    // Fallback also uses 302 to prevent aggressive browser caching
    return Response.redirect(new URL('/', url.origin).toString(), 302);
  }
}