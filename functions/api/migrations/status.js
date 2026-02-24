export async function onRequest(context) {
    const { request, env } = context;
    
    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    } 
    
    try {
        // Check if migrations table exists
        const tableCheck = await env.DB.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='migrations'
        `).all();
        
        if (tableCheck.results.length === 0) {
            return new Response(JSON.stringify({ 
                success: true,
                migrations: [],
                message: 'No migrations table found. Run initial migration.'
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get executed migrations
        const { results } = await env.DB.prepare(`
            SELECT name, executed_at FROM migrations 
            ORDER BY executed_at ASC
        `).all();
        
        return new Response(JSON.stringify({ 
            success: true,
            migrations: results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false, 
            message: e.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}