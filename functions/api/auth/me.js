import { getUserById } from '../../utils/db.js';
import { getSessionFromCookie } from '../../utils/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });
  }
  
  try {
    const session = await getSessionFromCookie(request, env);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers
      });
    }
    
    const user = await getUserById(env, session.user_id);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify({ 
      user: {
        id: user.id,
        email: user.email,
        verified: user.verified,
        created_at: user.created_at
      }
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