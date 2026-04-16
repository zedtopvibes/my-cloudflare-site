import { getUserById } from '../../utils/db.js';
import { getSessionFromCookie } from '../../utils/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  try {
    // Get session from cookie
    const session = await getSessionFromCookie(request, env);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers
      });
    }
    
    // Get user details
    const user = await getUserById(env, session.user_id);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify({ 
      user: user
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Me error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}