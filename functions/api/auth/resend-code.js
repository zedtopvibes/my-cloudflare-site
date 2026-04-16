import { getUserByEmail } from '../../utils/db.js';
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
    const { email } = await request.json();
    
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers
      });
    }
    
    const user = await getUserByEmail(env, email);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers
      });
    }
    
    if (user.verified) {
      return new Response(JSON.stringify({ error: 'Email already verified' }), {
        status: 400,
        headers
      });
    }
    
    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in KV with 15 min expiry
    await env.SESSION_KV.put(`verify:${email}`, code, {
      expirationTtl: 900
    });
    
    // Send new code
    await sendVerificationCode(env, email, code, email.split('@')[0]);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'New verification code sent to your email.'
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Resend code error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}