export async function onRequest(context) {
    const { request, env } = context;
    
    // Parse cookies
    const cookie = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(
        cookie.split('; ')
            .filter(c => c)
            .map(c => {
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
                // Valid session - serve the dashboard directly
                // This prevents a redirect loop
                const url = new URL(request.url);
                const dashboardUrl = new URL('/admin/index.html', url.origin);
                
                // Fetch the dashboard HTML
                const dashboardResponse = await fetch(dashboardUrl.toString());
                const dashboardHtml = await dashboardResponse.text();
                
                return new Response(dashboardHtml, {
                    headers: { "Content-Type": "text/html" },
                });
            }
        } catch (error) {
            console.error('Session validation error:', error);
        }
    }
    
    // No valid session - redirect to login page
    return new Response(null, {
        status: 302,
        headers: { "Location": "/login" },
    });
}