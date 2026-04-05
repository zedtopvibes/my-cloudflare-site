export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    // GET goal
    if (method === 'GET') {
        try {
            const result = await env.DB.prepare('SELECT target_subs, enabled FROM yt_goal WHERE id = 1').first();
            return new Response(JSON.stringify({ success: true, data: result || { target_subs: 1000, enabled: true } }), {
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
    
    // PUT update goal
    if (method === 'PUT') {
        try {
            const { target_subs, enabled } = await request.json();
            
            await env.DB.prepare(
                'UPDATE yt_goal SET target_subs = ?, enabled = ? WHERE id = 1'
            ).bind(target_subs, enabled ? 1 : 0).run();
            
            return new Response(JSON.stringify({ success: true, message: 'Goal updated successfully' }), {
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
    
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}