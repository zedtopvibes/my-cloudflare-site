import { createUser, getUserByEmail } from '../../utils/db.js';
import { hashPassword, generateSalt } from '../../utils/password.js';
import { sendVerificationCode } from '../../utils/email.js';

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
    
    const existingUser = await getUserByEmail(env, email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers
      });
    }
    
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = await createUser(env, email, passwordHash, salt);
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in KV with 15 min expiry
    await env.SESSION_KV.put(`verify:${email}`, code, {
      expirationTtl: 900
    });
    
    // Send verification code email
    await sendVerificationCode(env, email, code, email.split('@')[0]);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Verification code sent to your email. Please verify to complete signup.',
      email: email
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