import { extractTokenFromCookie, getSession } from './session.js';

export async function requireAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  const token = extractTokenFromCookie(cookieHeader);
  
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }
  
  const session = await getSession(env, token);
  
  if (!session) {
    return { error: 'Session expired or invalid', status: 401 };
  }
  
  return { user: session, token };
}

export async function optionalAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  const token = extractTokenFromCookie(cookieHeader);
  
  if (!token) return { user: null };
  
  const session = await getSession(env, token);
  return { user: session || null };
}