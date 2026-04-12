export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  const redirectPaths = new Set([
    '/album', '/albums', '/artist', '/artists',
    '/compilation', '/ep', '/eps', '/compilations', '/genre', '/page',
    '/playlist', '/playlists', '/song',
    '/test-css', '/test-shared'
  ]);

  // 1. Handle API/Admin (Modify headers of a successful request)
  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const response = await context.next();
    // We clone or create a new response if the original is immutable
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return newResponse;
  }
  
  // 2. Handle Redirects (Return the redirect immediately)
  // Don't try to set headers on a redirect; it's not allowed/needed.
  if (redirectPaths.has(pathname)) {
    return Response.redirect(new URL('/', url.origin).toString(), 302);
  }
  
  try {
    return await context.next();
  } catch (error) {
    return Response.redirect(new URL('/', url.origin).toString(), 302);
  }
}
