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
        // REMOVED ONLY: updated_at (doesn't exist)
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
                total_downloads,
                created_at
            FROM artists 
            WHERE slug = ?
        `).bind(slug).first();
        
        if (!artist) {
            return new Response(JSON.stringify({ error: 'Artist not found' }), { 
                status: 404, 
                headers 
            });
        }
        
        // ===== Get artist's tracks via track_artists junction table =====
        const { results: tracks } = await env.DB.prepare(`
            SELECT 
                t.id,
                t.title,
                t.slug as track_slug,
                t.duration,
                t.genre,
                t.plays,
                t.downloads,
                t.views,
                t.uploaded_at,
                t.release_date,
                t.artwork_url,
                ta.is_primary,
                ta.display_order,
                json_group_array(
                    json_object(
                        'id', a.id,
                        'name', a.name,
                        'slug', a.slug,
                        'is_primary', ta2.is_primary,
                        'display_order', ta2.display_order
                    )
                    ORDER BY ta2.display_order ASC, ta2.is_primary DESC
                ) as all_artists
            FROM tracks t
            JOIN track_artists ta ON t.id = ta.track_id
            LEFT JOIN track_artists ta2 ON t.id = ta2.track_id
            LEFT JOIN artists a ON ta2.artist_id = a.id
            WHERE ta.artist_id = ?
            GROUP BY t.id
            ORDER BY ta.is_primary DESC, ta.display_order ASC, t.plays DESC
        `).bind(artist.id).all();
        
        // Process tracks to parse all_artists JSON and add convenience fields
        const processedTracks = tracks.map(track => {
            const allArtists = track.all_artists ? JSON.parse(track.all_artists) : [];
            const primaryArtist = allArtists.find(a => a.is_primary === 1) || allArtists[0];
            
            // Split tracks into primary and featured for frontend convenience
            const isPrimary = track.is_primary === 1;
            
            return {
                id: track.id,
                title: track.title,
                slug: track.track_slug,
                duration: track.duration,
                genre: track.genre,
                plays: track.plays,
                downloads: track.downloads,
                views: track.views,
                uploaded_at: track.uploaded_at,
                release_date: track.release_date,
                artwork_url: track.artwork_url,
                is_primary_for_this_artist: isPrimary,
                display_order: track.display_order,
                artists: allArtists,
                // Backward compatibility
                artist: primaryArtist ? primaryArtist.name : 'Unknown Artist',
                artist_id: primaryArtist ? primaryArtist.id : null,
                artist_slug: primaryArtist ? primaryArtist.slug : null
            };
        });
        
        // Split tracks into primary (songs by) and featured (songs featured in)
        const primaryTracks = processedTracks.filter(track => track.is_primary_for_this_artist === true);
        const featuredTracks = processedTracks.filter(track => track.is_primary_for_this_artist === false);
        
        // ===== Combine artist info with tracks =====
        return new Response(JSON.stringify({
            ...artist,
            tracks: processedTracks,
            primary_tracks: primaryTracks,
            featured_tracks: featuredTracks,
            stats: {
                total_tracks: processedTracks.length,
                primary_tracks_count: primaryTracks.length,
                featured_tracks_count: featuredTracks.length,
                total_plays: processedTracks.reduce((sum, t) => sum + (t.plays || 0), 0),
                total_downloads: processedTracks.reduce((sum, t) => sum + (t.downloads || 0), 0)
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