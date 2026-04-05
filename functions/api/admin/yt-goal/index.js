export async function onRequest(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        const result = await env.DB.prepare('SELECT target_subs, enabled FROM yt_goal WHERE id = 1').first();
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: result || { target_subs: 1000, enabled: true }
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