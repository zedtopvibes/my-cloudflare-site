import { handleSignup, handleLogin, handleLogout, handleMe } from './auth.js';
import { requireAuth } from './middleware.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    try {
      // Require /api prefix for all endpoints
      if (!path.startsWith('/api/')) {
        return new Response(JSON.stringify({ 
          error: 'API endpoints must start with /api/',
          example: '/api/auth/signup'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Remove /api prefix for routing
      const route = path.replace('/api', '');
      
      // Public endpoints
      if (route === '/auth/signup' && method === 'POST') {
        return handleSignup(request, env);
      }
      
      if (route === '/auth/login' && method === 'POST') {
        return handleLogin(request, env);
      }
      
      // Protected endpoints (require authentication)
      if (route === '/auth/me' && method === 'GET') {
        const auth = await requireAuth(request, env);
        if (auth.error) {
          return new Response(JSON.stringify({ error: auth.error }), {
            status: auth.status,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return handleMe(request, env, auth.user);
      }
      
      if (route === '/auth/logout' && method === 'POST') {
        return handleLogout(request, env);
      }
      
      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};