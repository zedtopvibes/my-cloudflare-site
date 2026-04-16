export async function requireAuth(request, env) {
  const cookie = request.headers.get('Cookie');
  const token = extractTokenFromCookie(cookie); // 'session_token=abc123'
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  const session = await env.SESSION_KV.get(`session:${token}`, 'json');
  
  if (!session) {
    return { error: 'Session expired', status: 401 };
  }
  
  return { user: session };
}