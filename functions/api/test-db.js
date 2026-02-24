export async function onRequest(context) {
    const { env } = context;
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'DB binding not found'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Simple test query
        const result = await env.DB.prepare('SELECT 1 as connected').first();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'D1 connected!',
            result
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: e.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}