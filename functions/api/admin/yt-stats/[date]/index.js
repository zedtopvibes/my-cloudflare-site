export async function onRequest(context) {
    const { env, params } = context;
    const date = params.date;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        await env.DB.prepare('DELETE FROM yt_stats WHERE date = ?').bind(date).run();
        
        return new Response(JSON.stringify({ success: true, message: 'Deleted successfully' }), {
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