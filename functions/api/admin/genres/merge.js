export async function onRequest(context) {
    const { request, env } = context;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
    
    try {
        const { source, target } = await request.json();
        
        if (!source || !target) {
            return new Response(JSON.stringify({ error: 'Source and target required' }), { status: 400, headers });
        }
        
        await env.DB.prepare(`UPDATE artists SET genre = ? WHERE genre = ?`).bind(target, source).run();
        await env.DB.prepare(`UPDATE albums SET genre = ? WHERE genre = ?`).bind(target, source).run();
        await env.DB.prepare(`UPDATE eps SET genre = ? WHERE genre = ?`).bind(target, source).run();
        
        return new Response(JSON.stringify({ success: true }), { headers });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}