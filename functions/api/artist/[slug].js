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
        
        // Get artist info from artists table
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
        
        // ===== GET ALL TRACKS (PRIMARY + FEATURED) =====
        const { results: allTracks } = await env.DB.prepare(`
            SELECT 
                t.id,
                t.title,
                t.slug as track_slug,
                t.artist as primary_artist,
                t.artist_slug as primary_artist_slug,
                t.duration,
                t.genre,
                t.plays,
                t.downloads,
                t.views,
                t.uploaded_at,
                t.artwork_url,
                CASE 
                    WHEN t.artist_slug = ? THEN 'primary'
                    ELSE 'featured'
                END as contribution_type,
                (
                    SELECT GROUP_CONCAT(artist_name, ', ')
                    FROM featured_artists 
                    WHERE track_id = t.id 
                    AND artist_slug != ?
                ) as other_featured_artists
            FROM tracks t
            WHERE t.artist_slug = ? 
               OR t.id IN (
                    SELECT track_id 
                    FROM featured_artists 
                    WHERE artist_slug = ?
                )
            ORDER BY t.uploaded_at DESC
        `).bind(slug, slug, slug, slug).all();
        
        // ===== ALSO GET FEATURED ARTIST STATS (for display) =====
        const { results: featuredStats } = await env.DB.prepare(`
            SELECT 
                COUNT(*) as featured_track_count,
                SUM(t.plays) as featured_total_plays,
                SUM(t.downloads) as featured_total_downloads
            FROM tracks t
            JOIN featured_artists f ON t.id = f.track_id
            WHERE f.artist_slug = ?
        `).bind(slug).first();
        
        // ===== Combine artist info with all tracks =====
        return new Response(JSON.stringify({
            ...artist,
            all_tracks: allTracks || [],
            stats: {
                primary_tracks: allTracks.filter(t => t.contribution_type === 'primary').length,
                featured_tracks: allTracks.filter(t => t.contribution_type === 'featured').length,
                total_tracks: allTracks.length,
                total_plays: (artist.total_plays || 0) + (featuredStats?.featured_total_plays || 0),
                total_downloads: (artist.total_downloads || 0) + (featuredStats?.featured_total_downloads || 0),
                featured_stats: {
                    count: featuredStats?.featured_track_count || 0,
                    plays: featuredStats?.featured_total_plays || 0,
                    downloads: featuredStats?.featured_total_downloads || 0
                }
            }
        }), { headers });
        
    } catch (error) {
        console.error('Error fetching artist:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers 
        });
    }
}