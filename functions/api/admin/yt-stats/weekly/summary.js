export async function onRequest(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    try {
        // Get all stats ordered by date (oldest first)
        const results = await env.DB.prepare(
            'SELECT * FROM yt_stats ORDER BY date ASC'
        ).all();
        
        const allStats = results.results;
        
        if (!allStats || allStats.length === 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                data: { 
                    weekly_gain: 0, 
                    monthly_gain: 0,
                    message: 'No data available' 
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        // Get latest record
        const latestRecord = allStats[allStats.length - 1];
        
        // Helper function to find closest record within days range
        function findRecordFromDaysAgo(days) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - days);
            const targetDateStr = targetDate.toISOString().split('T')[0];
            
            let closestRecord = null;
            for (let i = 0; i < allStats.length; i++) {
                if (allStats[i].date <= targetDateStr) {
                    closestRecord = allStats[i];
                }
            }
            return closestRecord || allStats[0];
        }
        
        // Get records from 7 days and 30 days ago
        const weeklyOldRecord = findRecordFromDaysAgo(7);
        const monthlyOldRecord = findRecordFromDaysAgo(30);
        
        // Calculate gains
        let weeklyGain = 0;
        let monthlyGain = 0;
        
        if (latestRecord && weeklyOldRecord && latestRecord.date !== weeklyOldRecord.date) {
            weeklyGain = latestRecord.subscribers - weeklyOldRecord.subscribers;
        } else if (allStats.length >= 2) {
            weeklyGain = allStats[allStats.length - 1].subscribers - allStats[allStats.length - 2].subscribers;
        }
        
        if (latestRecord && monthlyOldRecord && latestRecord.date !== monthlyOldRecord.date) {
            monthlyGain = latestRecord.subscribers - monthlyOldRecord.subscribers;
        } else if (allStats.length >= 2) {
            monthlyGain = allStats[allStats.length - 1].subscribers - allStats[allStats.length - 2].subscribers;
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: { 
                weekly_gain: weeklyGain,
                monthly_gain: monthlyGain,
                current_subs: latestRecord?.subscribers || 0,
                weekly_start_date: weeklyOldRecord?.date || null,
                monthly_start_date: monthlyOldRecord?.date || null,
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