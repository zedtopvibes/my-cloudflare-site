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
        const { genre } = await request.json();
        
        if (!genre) {
            return new Response(JSON.stringify({ error: 'Genre name required' }), { status: 400, headers });
        }
        
        await env.DB.prepare(`UPDATE artists SET genre = NULL WHERE genre = ?`).bind(genre).run();
        await env.DB.prepare(`UPDATE albums SET genre = NULL WHERE genre = ?`).bind(genre).run();
        await env.DB.prepare(`UPDATE eps SET genre = NULL WHERE genre = ?`).bind(genre).run();
        
        return new Response(JSON.stringify({ success: true }), { headers });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}