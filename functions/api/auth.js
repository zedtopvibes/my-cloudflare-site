export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method === 'POST') {
        try {
            const { password } = await request.json();
            
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
    
    // Return 405 for non-POST requests
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