export async function onRequest(context) {
    const { request, env } = context;
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
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
    
    try {
        const { username, password } = await request.json();
        
        // Check if username and password are provided
        if (!username || !password) {
            return new Response(JSON.stringify({ 
                success: false,
                message: 'Username and password required' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check username and password against environment variables
        if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ 
                success: true,
                message: 'Authenticated' 
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ 
                success: false,
                message: 'Invalid username or password' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false,
            message: 'Invalid request format' 
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}