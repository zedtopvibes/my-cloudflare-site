export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    try {
        // Check if genre exists
        const genreCheck = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM albums 
            WHERE genre = ? AND deleted_at IS NULL AND status = 'published'
        `).bind(slug).first();
        
        if (genreCheck.count === 0) {
            return new Response('Genre not found', { status: 404 });
        }
        
        // Serve the genre template
        const template = await env.ASSETS.fetch(new URL('/genre.html', request.url));
        return template;
        
    } catch (error) {
        console.error('Error loading genre page:', error);
        return new Response('Server error', { status: 500 });
    }
}