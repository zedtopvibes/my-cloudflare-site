export async function onRequest(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        // Get all stats ordered by date (oldest first for calculation)
        const results = await env.DB.prepare(
            'SELECT * FROM yt_stats ORDER BY date ASC'
        ).all();
        
        const allStats = results.results;
        
        if (!allStats || allStats.length === 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                data: { weekly_gain: 0, message: 'No data available' }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Get today's date and date from 7 days ago
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        // Find the most recent record (should be today or latest available)
        const latestRecord = allStats[allStats.length - 1];
        
        // Find record from 7 days ago (or closest date within range)
        let oldRecord = null;
        let closestDate = null;
        
        for (let i = 0; i < allStats.length; i++) {
            const recordDate = allStats[i].date;
            if (recordDate <= sevenDaysAgoStr) {
                oldRecord = allStats[i];
                closestDate = recordDate;
            }
        }
        
        // If no record from 7 days ago, use the earliest available
        if (!oldRecord && allStats.length > 0) {
            oldRecord = allStats[0];
        }
        
        // Calculate weekly gain
        let weeklyGain = 0;
        if (latestRecord && oldRecord && latestRecord.date !== oldRecord.date) {
            weeklyGain = latestRecord.subscribers - oldRecord.subscribers;
        } else if (allStats.length >= 2) {
            // Fallback: use difference between latest and second latest
            weeklyGain = allStats[allStats.length - 1].subscribers - allStats[allStats.length - 2].subscribers;
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: { 
                weekly_gain: weeklyGain,
                current_subs: latestRecord?.subscribers || 0,
                previous_subs: oldRecord?.subscribers || 0,
                start_date: oldRecord?.date || null,
                end_date: latestRecord?.date || null
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