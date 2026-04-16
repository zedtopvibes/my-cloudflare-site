export function generateSessionToken() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(env, userId, email) {
  const token = generateSessionToken();
  const sessionData = { user_id: userId, email: email };
  
  await env.SESSION_KV.put(`session:${token}`, JSON.stringify(sessionData), {
    expirationTtl: 604800 // 7 days
  });
  
  return token;
}

export async function getSession(env, token) {
  return await env.SESSION_KV.get(`session:${token}`, 'json');
}

export async function deleteSession(env, token) {
  await env.SESSION_KV.delete(`session:${token}`);
}

export function setSessionCookie(token) {
  return `session_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `session_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/session_token=([^;]+)/);
  return match ? match[1] : null;
}