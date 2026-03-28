export async function onRequest(context) {
    const { request, env, params } = context;
    const id = params.id;
    
    try {
        // Get track details
        const track = await env.DB.prepare(`
            SELECT r2_key, filename FROM tracks WHERE id = ?
        `).bind(id).first();
        
        if (!track) {
            return new Response('Track not found', { status: 404 });
        }
        
        // Update downloads in background
        context.waitUntil(
            env.DB.prepare(`UPDATE tracks SET downloads = downloads + 1 WHERE id = ?`)
                .bind(id)
                .run()
                .catch(e => console.error('Download tracking failed:', e))
        );
        
        // Direct R2 URL
        const r2Url = `https://pub-fec6ab79d63347f48cfcfc5af6928ff0.r2.dev/${track.r2_key}`;
        
        // Redirect immediately
        return new Response(null, {
            status: 302,
            headers: {
                'Location': r2Url,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(track.filename)}"`
            }
        });
        
    } catch (error) {
        console.error('Download error:', error);
        return new Response('Error', { status: 500 });
    }
}