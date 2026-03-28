export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    try {
        const page = await env.DB.prepare(`
            SELECT id, title, slug, content, status, created_at, updated_at
            FROM pages 
            WHERE slug = ? AND deleted_at IS NULL AND status = 'published'
        `).bind(slug).first();
        
        if (!page) {
            return new Response(JSON.stringify({ error: 'Page not found' }), { 
                status: 404, 
                headers 
            });
        }
        
        return new Response(JSON.stringify(page), { headers });
        
    } catch (error) {
        console.error('Error fetching page:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers 
        });
    }
}