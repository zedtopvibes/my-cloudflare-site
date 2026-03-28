export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    try {
        // Use LOWER() for case-insensitive matching
        const genreCheck = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM (
                SELECT genre FROM artists WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
                UNION
                SELECT genre FROM albums WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
                UNION
                SELECT genre FROM eps WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
            )
        `).bind(slug, slug, slug).first();
        
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