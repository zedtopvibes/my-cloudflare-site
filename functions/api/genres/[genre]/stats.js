export async function onRequest(context) {
    const { request, env, params } = context;
    const genre = decodeURIComponent(params.genre);
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };
    
    try {
        // Case-insensitive matching using LOWER()
        const artistsCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM artists 
            WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
        `).bind(genre).first();
        
        const albumsCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM albums 
            WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
        `).bind(genre).first();
        
        const epsCount = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM eps 
            WHERE LOWER(genre) = LOWER(?) AND deleted_at IS NULL AND status = 'published'
        `).bind(genre).first();
        
        // Get top tracks
        const topTracks = await env.DB.prepare(`
            SELECT 
                t.id,
                t.title,
                t.slug,
                t.duration,
                t.plays,
                t.artwork_url,
                json_group_array(
                    json_object(
                        'id', a.id,
                        'name', a.name,
                        'slug', a.slug
                    )
                ) as artists
            FROM tracks t
            LEFT JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN artists a ON ta.artist_id = a.id
            WHERE LOWER(t.genre) = LOWER(?) AND t.deleted_at IS NULL AND t.status = 'published'
            GROUP BY t.id
            ORDER BY t.plays DESC
            LIMIT 10
        `).bind(genre).all();
        
        const processedTracks = topTracks.results.map(track => {
            let artists = [];
            try {
                artists = JSON.parse(track.artists);
            } catch (e) {
                artists = [];
            }
            const primaryArtist = artists.find(a => a.is_primary === 1) || artists[0];
            
            return {
                id: track.id,
                title: track.title,
                slug: track.slug,
                duration: track.duration,
                plays: track.plays,
                artwork_url: track.artwork_url,
                artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
                artist_slug: primaryArtist ? primaryArtist.slug : null
            };
        });
        
        return new Response(JSON.stringify({
            genre: genre,
            stats: {
                artists: artistsCount?.count || 0,
                albums: albumsCount?.count || 0,
                eps: epsCount?.count || 0,
                total: (artistsCount?.count || 0) + (albumsCount?.count || 0) + (epsCount?.count || 0)
            },
            top_tracks: processedTracks
        }), { headers });
        
    } catch (error) {
        console.error('Error fetching genre stats:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
}