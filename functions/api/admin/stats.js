// functions/api/admin/stats.js

export async function onRequest(context) {
    const { request, env } = context;
    
    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        // Query all stats in parallel (including homepage_views)
        const [tracksStats, albumsStats, epsStats, artistsStats, playlistsStats, homepageStats] = await Promise.all([
            env.DB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views), 0) as total_views,
                    COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) as published,
                    COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) as draft
                FROM tracks
            `).first(),
            
            env.DB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views), 0) as total_views
                FROM albums
            `).first(),
            
            env.DB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views), 0) as total_views
                FROM eps
            `).first(),
            
            env.DB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views), 0) as total_views
                FROM artists
            `).first(),
            
            env.DB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(views), 0) as total_views
                FROM playlists
            `).first(),
            
            // NEW: Get homepage views
            env.DB.prepare(`
                SELECT COALESCE(total_views, 0) as total_views
                FROM homepage_views 
                WHERE id = 1
            `).first()
        ]);
        
        // Calculate total views
        const totalViews = tracksStats.total_views + 
                         albumsStats.total_views + 
                         epsStats.total_views + 
                         artistsStats.total_views + 
                         playlistsStats.total_views +
                         (homepageStats?.total_views || 0);
        
        const response = {
            success: true,
            data: {
                tracks: {
                    total: tracksStats.total || 0,
                    total_views: tracksStats.total_views || 0,
                    published: tracksStats.published || 0,
                    draft: tracksStats.draft || 0
                },
                albums: {
                    total: albumsStats.total || 0,
                    total_views: albumsStats.total_views || 0
                },
                eps: {
                    total: epsStats.total || 0,
                    total_views: epsStats.total_views || 0
                },
                artists: {
                    total: artistsStats.total || 0,
                    total_views: artistsStats.total_views || 0
                },
                playlists: {
                    total: playlistsStats.total || 0,
                    total_views: playlistsStats.total_views || 0
                },
                homepage: {
                    total_views: homepageStats?.total_views || 0
                },
                total_views: totalViews
            }
        };
        
        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        console.error('Stats endpoint error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}