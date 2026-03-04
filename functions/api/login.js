export async function onRequest(context) {
    const { request, env } = context;
    
    // Handle CORS
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    } 

    // Only allow POST
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { username, password } = await request.json();
        
        // Get credentials from Cloudflare secrets
        const validUsername = env.ADMIN_USERNAME;
        const validPassword = env.ADMIN_PASSWORD;
        
        // Check credentials
        if (username === validUsername && password === validPassword) {
            return new Response(JSON.stringify({ 
                success: true,
                message: "Login successful" 
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        } else {
            return new Response(JSON.stringify({ 
                success: false,
                error: "Invalid username or password" 
            }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false,
            error: "Server error" 
        }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
}