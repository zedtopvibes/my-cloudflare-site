// /functions/api/admin/usage-stats.js
export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const R2_TOKEN = env.CF_API_TOKEN;
        const D1_TOKEN = env.D1_API_TOKEN;
        const BUCKET_NAME = "zedtopvibes-audio";
        const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";
        
        // Get R2 stats
        const r2Response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/usage`,
            {
                headers: {
                    "Authorization": `Bearer ${R2_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
        
        const r2Data = await r2Response.json();
        const usage = r2Data.result;
        const totalBytes = usage.payloadSize || 0;
        const totalGB = totalBytes / (1024 * 1024 * 1024);
        
        // Get D1 database info (correct endpoint)
        const d1Response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`,
            {
                headers: {
                    "Authorization": `Bearer ${D1_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
        
        const d1Data = await d1Response.json();
        
        // Get D1 database size (if available)
        let databaseSizeGB = 0;
        if (d1Data.success && d1Data.result) {
            const sizeBytes = d1Data.result.size_bytes || d1Data.result.file_size || 0;
            databaseSizeGB = sizeBytes / (1024 * 1024 * 1024);
        }
        
        return Response.json({
            success: true,
            data: {
                r2: {
                    total_bytes: totalBytes,
                    total_gb: totalGB.toFixed(2),
                    total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
                    total_objects: usage.objectCount || 0,
                    free_tier_limit_gb: 10,
                    remaining_free_gb: Math.max(0, 10 - totalGB).toFixed(2),
                    exceeded_free_tier: totalGB > 10,
                    estimated_monthly_cost: Math.max(0, (totalGB - 10) * 0.015).toFixed(4)
                },
                d1: {
                    database_id: DATABASE_ID,
                    database_name: d1Data.result?.name || "zedtopvibes-db",
                    database_size_bytes: d1Data.result?.size_bytes || 0,
                    database_size_gb: databaseSizeGB.toFixed(2),
                    num_tables: d1Data.result?.num_tables || 0,
                    version: d1Data.result?.version || "unknown",
                    raw_response: d1Data,
                    note: "D1 metrics API not available. Using database info endpoint.",
                    free_tier_limit_gb: 5,
                    remaining_free_gb: Math.max(0, 5 - databaseSizeGB).toFixed(2),
                    exceeded_free_tier: databaseSizeGB > 5,
                    estimated_monthly_cost: Math.max(0, (databaseSizeGB - 5) * 0.75).toFixed(2)
                },
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}