import { createUser, getUserByEmail, getUserById } from './db.js';
import { hashPassword, generateSalt, verifyPassword } from './password.js';
import { createSession, setSessionCookie, deleteSession, clearSessionCookie } from './session.js';

export async function handleSignup(request, env) {
  try {
    const { email, password } = await request.json();
    
    // Validation
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user exists
    const existingUser = await getUserByEmail(env, email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
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
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get user
    const user = await getUserByEmail(env, email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
        'Content-Type': 'application/json',
        'Set-Cookie': setSessionCookie(token)
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleLogout(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  const tokenMatch = cookieHeader?.match(/session_token=([^;]+)/);
  
  if (tokenMatch) {
    await deleteSession(env, tokenMatch[1]);
  }
  
  return new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie()
    }
  });
}

export async function handleMe(request, env, user) {
  const userDetails = await getUserById(env, user.user_id);
  
  return new Response(JSON.stringify({ 
    user: userDetails
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}