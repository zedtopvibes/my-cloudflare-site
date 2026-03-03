// File: /functions/admin/index.js
export async function onRequest(context) {
    const { request, env } = context;
    
    // Parse cookies
    const cookie = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(
        cookie.split('; ').filter(c => c).map(c => {
            const [key, value] = c.split('=');
            return [key, value];
        })
    );
    
    const sessionToken = cookies['admin_session'];
    
    // Check if session exists in KV
    if (sessionToken) {
        try {
            const sessionData = await env.LOGIN_SESSIONS.get(sessionToken);
            
            if (sessionData) {
                // Valid session - redirect to the actual admin HTML file
                return new Response(null, {
                    status: 302,
                    headers: { "Location": "/admin/dashboard.html" },
                });
            }
        } catch (error) {
            console.error('Session validation error:', error);
        }
    }
    
    // No valid session - redirect to login
    return new Response(null, {
        status: 302,
        headers: { "Location": "/" },
    });
}