import { getUserByEmail } from '../../utils/db.js';
import { verifyPassword } from '../../utils/password.js';
import { createSession, setSessionCookie } from '../../utils/session.js';

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
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers
      });
    }
    
    const user = await getUserByEmail(env, email);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers
      });
    }
    
    // Check if email is verified
    if (!user.verified) {
      return new Response(JSON.stringify({ 
        error: 'Please verify your email before logging in. Check your inbox.',
        needsVerification: true
      }), {
        status: 403,
        headers
      });
    }
    
    const isValid = await verifyPassword(password, user.password_hash, user.salt);
    
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers
      });
    }
    
    const token = await createSession(env, user.id, user.email);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Login successful',
      user: { id: user.id, email: user.email, verified: user.verified }
    }), {
      status: 200,
      headers: {
        ...headers,
        'Set-Cookie': setSessionCookie(token)
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}