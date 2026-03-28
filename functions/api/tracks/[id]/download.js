export async function onRequest(context) {
    const { request, env, params } = context;
    const id = params.id;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    
    // Respond immediately with success, then track in background
    if (request.method === 'POST') {
        const response = new Response(JSON.stringify({ success: true }), { headers });
        
        // Track download in background
        context.waitUntil(
            env.DB.prepare(`
                UPDATE tracks SET downloads = downloads + 1 WHERE id = ?
            `).bind(id).run()
            .catch(e => console.error('Download tracking failed:', e))
        );
        
        return response;
    }
    
    // GET - for actual file download (if you want to serve file)
    if (request.method === 'GET') {
        try {
            const track = await env.DB.prepare(`
                SELECT r2_key, filename FROM tracks WHERE id = ? AND deleted_at IS NULL
            `).bind(id).first();
            
            if (!track) {
                return new Response('Track not found', { status: 404 });
            }
            
            // Track download in background
            context.waitUntil(
                env.DB.prepare(`
                    UPDATE tracks SET downloads = downloads + 1 WHERE id = ?
                `).bind(id).run()
                .catch(e => console.error('Download tracking failed:', e))
            );
            
            // Get file from R2 and serve with download headers
            const file = await env.AUDIO.get(track.r2_key);
            
            if (!file) {
                return new Response('File not found', { status: 404 });
            }
            
            const fileHeaders = new Headers();
            fileHeaders.set('Content-Type', 'audio/mpeg');
            fileHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(track.filename)}"`);
            fileHeaders.set('Cache-Control', 'public, max-age=3600');
            
            return new Response(file.body, { headers: fileHeaders });
            
        } catch (error) {
            console.error('Download error:', error);
            return new Response('Error', { status: 500 });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers 
    });
}