export async function onRequest(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    const channelId = env.YOUTUBE_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY;
    
    // Check if environment variables exist
    if (!channelId || !apiKey) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Missing environment variables',
            channelId_exists: !!channelId,
            apiKey_exists: !!apiKey
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Channel not found',
                channelId: channelId,
                api_response: data
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        const stats = data.items[0].statistics;
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: {
                subscribers: parseInt(stats.subscriberCount),
                total_views: parseInt(stats.viewCount),
                videos_uploaded: parseInt(stats.videoCount)
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}