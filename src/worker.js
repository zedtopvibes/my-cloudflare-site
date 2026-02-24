export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // Handle admin API requests
        if (url.pathname === '/api/auth') {
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
            }
        }
        
        // Serve static files from Pages
        return env.ASSETS.fetch(request);
    }
}