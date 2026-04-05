export async function onRequest(context) {
    const { env, request } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        const { target_subs, enabled } = await request.json();
        
        await env.DB.prepare(
            'UPDATE yt_goal SET target_subs = ?, enabled = ? WHERE id = 1'
        ).bind(target_subs, enabled ? 1 : 0).run();
        
        return new Response(JSON.stringify({ success: true, message: 'Goal updated' }), {
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