export async function onRequest(context) {
    const { request, env, params } = context;
    const id = params.id;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405, 
            headers 
        });
    }
    
    // Respond immediately
    const response = new Response(JSON.stringify({ success: true }), { headers });
    
    // Track play in background
    context.waitUntil(
        env.DB.prepare(`
            UPDATE tracks SET plays = plays + 1 WHERE id = ?
        `).bind(id).run()
        .catch(e => console.error('Play tracking failed:', e))
    );
    
    return response;
}