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

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { username, password } = await request.json();
        
        const validUsername = env.ADMIN_USERNAME;
        const validPassword = env.ADMIN_PASSWORD;
        
        if (username === validUsername && password === validPassword) {
            const sessionToken = crypto.randomUUID();
            
            await env.LOGIN_SESSIONS.put(sessionToken, JSON.stringify({
                username,
                loginTime: Date.now(),
                userAgent: request.headers.get("User-Agent") || "unknown",
                ip: request.headers.get("CF-Connecting-IP") || "unknown"
            }), {
                expirationTtl: 86400 // 24 hours
            });
            
            return new Response(JSON.stringify({ 
                success: true,
                message: "Login successful" 
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Set-Cookie": `admin_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`,
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