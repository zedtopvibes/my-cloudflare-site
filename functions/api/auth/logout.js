import { deleteSession, clearSessionCookie, extractTokenFromCookie } from '../../utils/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }
  
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = extractTokenFromCookie(cookieHeader);
    
    if (token) {
      await deleteSession(env, token);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        ...headers,
        'Set-Cookie': clearSessionCookie()
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}