export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // Handle admin API requests
        if (url.pathname === '/api/auth') {
            // Only allow POST requests to /api/auth
            if (request.method === 'POST') {
                try {
                    const { password } = await request.json();
                    
                    // Use environment variable for password
                    if (password === env.ADMIN_PASSWORD) {
                        return new Response(JSON.stringify({ 
                            success: true,
                            message: 'Authenticated' 
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } else {
                        return new Response(JSON.stringify({ 
                            success: false,
                            message: 'Invalid password' 
                        }), {
                            status: 401,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } catch (e) {
                    return new Response(JSON.stringify({ 
                        success: false,
                        message: 'Invalid request' 
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } else {
                // Return 405 Method Not Allowed for non-POST requests
                return new Response(JSON.stringify({ 
                    success: false,
                    message: 'Method not allowed. Use POST.' 
                }), {
                    status: 405,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Allow': 'POST'
                    }
                });
            }
        }
        
        // Serve static files from Pages for all other routes
        return env.ASSETS.fetch(request);
    }
}