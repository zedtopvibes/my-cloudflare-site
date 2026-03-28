export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    try {
        // Fetch page from database
        const page = await env.DB.prepare(`
            SELECT id, title, content, updated_at 
            FROM pages 
            WHERE slug = ? AND deleted_at IS NULL AND status = 'published'
        `).bind(slug).first();
        
        if (!page) {
            return new Response('Page not found', { 
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        // Serve the page template
        const template = await env.ASSETS.fetch(new URL('/page.html', request.url));
        return template;
        
    } catch (error) {
        console.error('Error loading page:', error);
        return new Response('Server error', { 
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}