export async function onRequest(context) {
    const { request, env, params } = context;
    const genre = decodeURIComponent(params.genre);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    try {
        const { results } = await env.DB.prepare(`
            SELECT 
                a.id,
                a.name,
                a.slug,
                a.image_url,
                a.is_featured,
                (SELECT COUNT(*) FROM track_artists WHERE artist_id = a.id) as track_count
            FROM artists a
            WHERE a.deleted_at IS NULL 
                AND a.status = 'published'
                AND LOWER(a.genre) = LOWER(?)
            ORDER BY a.is_featured DESC, a.name ASC
            LIMIT 20
        `).bind(genre).all();
        
        return new Response(JSON.stringify(results), { headers });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}