import { createUser, getUserByEmail, setVerificationToken } from '../../utils/db.js';
import { hashPassword, generateSalt } from '../../utils/password.js';
import { sendVerificationEmail } from '../../utils/email.js';

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
    
    // Validate email
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
    
    // Generate verification token
    const verificationToken = crypto.randomUUID();
    await setVerificationToken(env, user.id, verificationToken);
    
    // Store in KV with 24h expiry
    await env.SESSION_KV.put(`verify:${verificationToken}`, user.id, {
      expirationTtl: 86400
    });
    
    // Send verification email
    await sendVerificationEmail(env, email, verificationToken, email.split('@')[0]);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User created. Please check your email to verify your account.',
      user: { id: user.id, email: user.email }
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