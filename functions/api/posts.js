export async function onRequest(context) {
    const { request, env } = context;
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    
    // GET - Fetch all published posts
    if (request.method === 'GET') {
        try {
            const { results } = await env.DB.prepare(`
                SELECT 
                    id, title, slug, description, 
                    image_path, date, views
                FROM posts 
                WHERE published = 1 
                ORDER BY date DESC
                LIMIT 20
            `).all();
            
            return new Response(JSON.stringify({ 
                success: true,
                posts: results 
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
    
    // POST - Create new post (admin only - we'll add auth check)
    if (request.method === 'POST') {
        // TODO: Add admin authentication check
        try {
            const { title, description, content, image_path, audio_path } = await request.json();
            
            // Generate slug from title
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            
            const { results } = await env.DB.prepare(`
                INSERT INTO posts (title, slug, description, content, image_path, audio_path, date)
                VALUES (?, ?, ?, ?, ?, ?, date('now'))
                RETURNING id, title, slug
            `).bind(title, slug, description, content, image_path, audio_path).run();
            
            return new Response(JSON.stringify({ 
                success: true,
                post: results[0]
            }), {
                status: 201,
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