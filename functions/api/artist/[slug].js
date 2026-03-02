export async function onRequest(context) {
    const { request, env, params } = context;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    // Only allow GET
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
            status: 405, 
            headers 
        });
    }

    try {
        const slug = params.slug;
        
        // ===== NEW: Get artist info from artists table =====
        const artist = await env.DB.prepare(`
            SELECT 
                id,
                name,
                slug,
                image_url,
                bio,
                country,
                is_featured,
                is_zambian_legend,
                total_tracks,
                total_plays,
                total_downloads
            FROM artists 
            WHERE slug = ?
        `).bind(slug).first();
        
        if (!artist) {
            return new Response(JSON.stringify({ error: 'Artist not found' }), { 
                status: 404, 
                headers 
            });
        }
        
        // ===== Get artist's tracks from tracks table =====
        const { results: tracks } = await env.DB.prepare(`
            SELECT 
                id,
                title,
                slug as track_slug,
                duration,
                genre,
                plays,
                downloads,
                views,
                uploaded_at
            FROM tracks 
            WHERE artist_slug = ?
            ORDER BY plays DESC
        `).bind(slug).all();
        
        // ===== Combine artist info with tracks =====
        return new Response(JSON.stringify({
            ...artist,
            tracks: tracks || []
        }), { headers });
        
    } catch (error) {
        console.error('Error fetching artist:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers 
        });
    }
}