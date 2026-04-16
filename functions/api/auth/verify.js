import { verifyUserByToken } from '../../utils/db.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'Verification token required' }), {
      status: 400,
      headers
    });
  }
  
  try {
    // Check if token exists in KV
    const userId = await env.SESSION_KV.get(`verify:${token}`);
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification link' }), {
        status: 400,
        headers
      });
    }
    
    // Verify user in database
    const user = await verifyUserByToken(env, token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers
      });
    }
    
    // Delete token from KV
    await env.SESSION_KV.delete(`verify:${token}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email verified successfully! You can now login.'
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}