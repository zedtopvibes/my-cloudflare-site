import { getUserByEmail, setVerificationToken } from '../../utils/db.js';

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
    const { email, code } = await request.json();
    
    if (!email || !code) {
      return new Response(JSON.stringify({ error: 'Email and code required' }), {
        status: 400,
        headers
      });
    }
    
    // Get stored code from KV
    const storedCode = await env.SESSION_KV.get(`verify:${email}`);
    
    if (!storedCode) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification code' }), {
        status: 400,
        headers
      });
    }
    
    if (storedCode !== code) {
      return new Response(JSON.stringify({ error: 'Incorrect verification code' }), {
        status: 400,
        headers
      });
    }
    
    // Get user and mark as verified
    const user = await getUserByEmail(env, email);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers
      });
    }
    
    // Mark user as verified
    const verificationToken = crypto.randomUUID();
    await setVerificationToken(env, user.id, verificationToken);
    
    // Update verified status
    const updateStmt = env.DB.prepare('UPDATE users SET verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE id = ?');
    await updateStmt.bind(user.id).run();
    
    // Delete the code from KV
    await env.SESSION_KV.delete(`verify:${email}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email verified successfully! You can now login.'
    }), {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Verify code error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    });
  }
}