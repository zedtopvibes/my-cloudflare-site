export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        }); 
    }
    
    // GET - Fetch single post
    if (request.method === 'GET') {
        try {
            // Get post
            const post = await env.DB.prepare(`
                SELECT * FROM posts 
                WHERE slug = ? AND published = 1
            `).bind(slug).first();
            
            if (!post) {
                return new Response(JSON.stringify({ 
                    success: false,
                    message: 'Post not found' 
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Increment view count
            await env.DB.prepare(`
                UPDATE posts SET views = views + 1 
                WHERE slug = ?
            `).bind(slug).run();
            
            return new Response(JSON.stringify({ 
                success: true,
                post 
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
    
    return new Response('Method not allowed', { status: 405 });
}