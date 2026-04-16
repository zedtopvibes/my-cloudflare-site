export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Public endpoints
    if (path === '/api/auth/signup' && request.method === 'POST') {
      return handleSignup(request, env);
    }
    if (path === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    
    // Protected endpoints (require auth)
    if (path === '/api/auth/me' && request.method === 'GET') {
      return handleMe(request, env);
    }
    if (path === '/api/auth/logout' && request.method === 'POST') {
      return handleLogout(request, env);
    }
    
    return new Response('Not found', { status: 404 });
  }
};