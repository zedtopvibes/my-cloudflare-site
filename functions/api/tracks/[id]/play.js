export async function onRequest(context) {
    const { request, env } = context;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    try {
        const { id } = await request.json();
        
        // Respond immediately
        const response = new Response(JSON.stringify({ success: true }), { headers });
        
        // Update plays in background
        context.waitUntil(
            env.DB.prepare(`UPDATE tracks SET plays = plays + 1 WHERE id = ?`)
                .bind(id)
                .run()
                .catch(e => console.error('Play tracking failed:', e))
        );
        
        return response;
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers 
        });
    }
}