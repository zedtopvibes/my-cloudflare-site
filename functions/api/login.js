// File: /functions/api/login.js
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
            // Generate a simple session token (in production, use a proper JWT)
            const sessionToken = crypto.randomUUID 
                ? crypto.randomUUID() 
                : `${Date.now()}-${Math.random().toString(36).substring(2)}`;
            
            // Set secure HTTP-only cookie
            return new Response(JSON.stringify({ 
                success: true,
                message: "Login successful" 
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Set-Cookie": `admin_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`, // 24 hours
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
        console.error('Login error:', error);
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