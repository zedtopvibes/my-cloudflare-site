export async function onRequest(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        const channelId = env.YOUTUBE_CHANNEL_ID;
        const apiKey = env.YOUTUBE_API_KEY;
        
        if (!channelId || !apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Missing YouTube configuration'
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
                error: 'Channel not found'
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
            data: { date: today, subscribers, total_views, videos_uploaded }
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