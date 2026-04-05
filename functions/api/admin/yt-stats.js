// functions/api/admin/yt-stats.js

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // ========== GET all stats ==========
    if (method === 'GET' && (path === '/api/admin/yt-stats' || path === '/api/admin/yt-stats/')) {
        try {
            const results = await env.DB.prepare(
                'SELECT * FROM yt_stats ORDER BY date DESC'
            ).all();
            return new Response(JSON.stringify({ success: true, data: results.results }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== GET single stat by date ==========
    if (method === 'GET' && path.match(/\/api\/admin\/yt-stats\/\d{4}-\d{2}-\d{2}$/)) {
        try {
            const date = path.split('/').pop();
            const result = await env.DB.prepare(
                'SELECT * FROM yt_stats WHERE date = ?'
            ).bind(date).first();
            return new Response(JSON.stringify({ success: true, data: result || null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== FETCH from YouTube API and auto-save ==========
    if (method === 'GET' && path === '/api/admin/yt-stats/fetch') {
        try {
            const channelId = env.YOUTUBE_CHANNEL_ID;
            const apiKey = env.YOUTUBE_API_KEY;
            
            if (!channelId || !apiKey) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Missing YouTube configuration. Set YOUTUBE_CHANNEL_ID and YOUTUBE_API_KEY in environment variables.'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            
            const youtubeUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
            const response = await fetch(youtubeUrl);
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Channel not found. Check your YOUTUBE_CHANNEL_ID'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            
            const stats = data.items[0].statistics;
            const today = new Date().toISOString().split('T')[0];
            
            const subscribers = parseInt(stats.subscriberCount);
            const total_views = parseInt(stats.viewCount);
            const videos_uploaded = parseInt(stats.videoCount);
            
            // Save to database
            await env.DB.prepare(`
                INSERT INTO yt_stats (date, subscribers, total_views, watch_hours, videos_uploaded)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(date) DO UPDATE SET
                    subscribers = excluded.subscribers,
                    total_views = excluded.total_views,
                    videos_uploaded = excluded.videos_uploaded
            `).bind(today, subscribers, total_views, 0, videos_uploaded).run();
            
            return new Response(JSON.stringify({ 
                success: true, 
                data: {
                    date: today,
                    subscribers,
                    total_views,
                    videos_uploaded
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== DELETE stat by date ==========
    if (method === 'DELETE' && path.match(/\/api\/admin\/yt-stats\/\d{4}-\d{2}-\d{2}$/)) {
        try {
            const date = path.split('/').pop();
            const result = await env.DB.prepare('DELETE FROM yt_stats WHERE date = ?').bind(date).run();
            
            if (result.meta.changes === 0) {
                return new Response(JSON.stringify({ success: false, error: 'No entry found for that date' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            
            return new Response(JSON.stringify({ success: true, message: 'Stats deleted successfully' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== GET weekly summary ==========
    if (method === 'GET' && path === '/api/admin/yt-stats/weekly/summary') {
        try {
            const results = await env.DB.prepare(`
                SELECT 
                    (SELECT subscribers FROM yt_stats ORDER BY date DESC LIMIT 1) as current_subs,
                    (SELECT subscribers FROM yt_stats WHERE date <= date('now', '-7 days') ORDER BY date DESC LIMIT 1) as subs_7_days_ago,
                    SUM(watch_hours) as total_watch_hours,
                    SUM(videos_uploaded) as total_videos_uploaded
                FROM yt_stats 
                WHERE date >= date('now', '-7 days')
            `).first();
            
            let weekly_gain = 0;
            if (results.current_subs && results.subs_7_days_ago) {
                weekly_gain = results.current_subs - results.subs_7_days_ago;
            }
            
            return new Response(JSON.stringify({ 
                success: true, 
                data: {
                    weekly_gain,
                    current_subs: results.current_subs,
                    total_watch_hours: results.total_watch_hours || 0,
                    total_videos_uploaded: results.total_videos_uploaded || 0
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== GET monthly summary ==========
    if (method === 'GET' && path === '/api/admin/yt-stats/monthly/summary') {
        try {
            const results = await env.DB.prepare(`
                SELECT 
                    (SELECT subscribers FROM yt_stats ORDER BY date DESC LIMIT 1) as current_subs,
                    (SELECT subscribers FROM yt_stats WHERE date <= date('now', '-30 days') ORDER BY date DESC LIMIT 1) as subs_30_days_ago,
                    SUM(watch_hours) as total_watch_hours,
                    SUM(videos_uploaded) as total_videos_uploaded
                FROM yt_stats 
                WHERE date >= date('now', '-30 days')
            `).first();
            
            let monthly_gain = 0;
            if (results.current_subs && results.subs_30_days_ago) {
                monthly_gain = results.current_subs - results.subs_30_days_ago;
            }
            
            return new Response(JSON.stringify({ 
                success: true, 
                data: {
                    monthly_gain,
                    current_subs: results.current_subs,
                    total_watch_hours: results.total_watch_hours || 0,
                    total_videos_uploaded: results.total_videos_uploaded || 0
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        } catch (error) {
            return new Response(JSON.stringify({ success: false, error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // ========== 404 Not Found ==========
    return new Response(JSON.stringify({ success: false, error: 'Endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}