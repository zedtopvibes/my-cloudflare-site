import { getUserByEmail } from '../../utils/db.js';
import { verifyPassword } from '../../utils/password.js';
import { createSession, setSessionCookie } from '../../utils/session.js';

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
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers
      });
    }
    
    // Get user
    const user = await getUserByEmail(env, email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers
      });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers
      });
    }
    
    // Create session
    const token = await createSession(env, user.id, user.email);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Login successful',
      user: { id: user.id, email: user.email, created_at: user.created_at }
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