export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  
  const redirectPaths = new Set([
    '/album', '/albums', '/artist', '/artists',
    '/compilation', '/ep', /eps', /compilations', '/genre', '/page',
    '/playlist', '/playlists', '/song',
    '/test-css', '/test-shared'
  ]);

  // 🚫 NOINDEX ONLY (no redirect)
  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const response = await context.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  
  // 🔁 REDIRECT + NOINDEX
  if (redirectPaths.has(pathname)) {
    const response = Response.redirect(new URL('/', url.origin).toString(), 302);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  
  try {
    return await context.next();
  } catch (error) {
    const response = Response.redirect(new URL('/', url.origin).toString(), 302);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
}