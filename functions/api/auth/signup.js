import { createUser, getUserByEmail } from '../../utils/db.js';
import { hashPassword, generateSalt } from '../../utils/password.js';

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
    
    // Validation
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers
      });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers
      });
    }
    
    // Check if user exists
    const existingUser = await getUserByEmail(env, email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers
      });
    }
    
    // Create user
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = await createUser(env, email, passwordHash, salt);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User created successfully',
      user: { id: user.id, email: user.email, created_at: user.created_at }
    }), {
      status: 201,
      headers
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}