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
                a.title,
                a.slug,
                a.cover_url,
                a.release_date,
                a.plays,
                a.is_featured,
                ar.name as artist_name,
                (SELECT COUNT(*) FROM album_tracks WHERE album_id = a.id) as track_count
            FROM albums a
            LEFT JOIN artists ar ON a.artist_id = ar.id
            WHERE a.deleted_at IS NULL 
                AND a.status = 'published'
                AND LOWER(a.genre) = LOWER(?)
            ORDER BY a.is_featured DESC, a.release_date DESC, a.plays DESC
            LIMIT 20
        `).bind(genre).all();
        
        return new Response(JSON.stringify(results), { headers });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}