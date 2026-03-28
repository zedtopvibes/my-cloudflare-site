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
                e.id,
                e.title,
                e.slug,
                e.cover_url,
                e.release_date,
                e.plays,
                e.is_featured,
                ar.name as artist_name,
                (SELECT COUNT(*) FROM ep_tracks WHERE ep_id = e.id) as track_count
            FROM eps e
            LEFT JOIN artists ar ON e.artist_id = ar.id
            WHERE e.deleted_at IS NULL 
                AND e.status = 'published'
                AND LOWER(e.genre) = LOWER(?)
            ORDER BY e.is_featured DESC, e.release_date DESC, e.plays DESC
            LIMIT 20
        `).bind(genre).all();
        
        return new Response(JSON.stringify(results), { headers });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}