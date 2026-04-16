import { deleteSession, clearSessionCookie, extractTokenFromCookie } from '../../utils/session.js';
 
export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
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