// /functions/api/admin/usage-stats.js
// Get R2 + D1 usage statistics

export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const API_TOKEN = env.CF_API_TOKEN;
        
        // Get R2 stats
        const r2Stats = await getR2Stats(ACCOUNT_ID, API_TOKEN);
        
        // Get D1 stats
        const d1Stats = await getD1Stats(ACCOUNT_ID, API_TOKEN);
        
        return Response.json({
            success: true,
            data: {
                r2: r2Stats,
                d1: d1Stats,
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

async function getR2Stats(accountId, apiToken) {
    const BUCKET_NAME = "zedtopvibes-audio";
    
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${BUCKET_NAME}/usage`,
        {
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
        }
    );
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'Failed to fetch R2 usage');
    }
    
    const usage = data.result;
    const totalBytes = usage.payloadSize || 0;
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    
    return {
        total_bytes: totalBytes,
        total_gb: totalGB.toFixed(2),
        total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
        total_objects: usage.objectCount || 0,
        free_tier_limit_gb: 10,
        remaining_free_gb: Math.max(0, 10 - totalGB).toFixed(2),
        exceeded_free_tier: totalGB > 10,
        estimated_monthly_cost: Math.max(0, (totalGB - 10) * 0.015).toFixed(4)
    };
}

async function getD1Stats(accountId, apiToken) {
    const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";
    
    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${DATABASE_ID}/metrics`,
            {
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        
        const data = await response.json();
        
        if (!data.success) {
            // Fallback to basic info if metrics API fails
            return {
                database_id: DATABASE_ID,
                database_name: "zedtopvibes-db",
                note: "Metrics API requires D1 Read permission",
                metrics_available: false
            };
        }
        
        const metrics = data.result;
        const sizeBytes = metrics.databaseSizeBytes || 0;
        const sizeGB = sizeBytes / (1024 * 1024 * 1024);
        
        return {
            database_id: DATABASE_ID,
            database_name: "zedtopvibes-db",
            metrics_available: true,
            database_size_bytes: sizeBytes,
            database_size_gb: sizeGB.toFixed(2),
            database_size_mb: (sizeBytes / (1024 * 1024)).toFixed(2),
            storage_size_bytes: metrics.storageSizeBytes || 0,
            storage_size_gb: ((metrics.storageSizeBytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
            query_count: metrics.queryCount || 0,
            rows_read: metrics.rowsRead || 0,
            rows_written: metrics.rowsWritten || 0,
            free_tier_limit_gb: 5,  // D1 free tier is 5 GB
            remaining_free_gb: Math.max(0, 5 - sizeGB).toFixed(2),
            exceeded_free_tier: sizeGB > 5,
            estimated_monthly_cost: Math.max(0, (sizeGB - 5) * 0.75).toFixed(2) // $0.75/GB
        };
        
    } catch (error) {
        console.error('Error fetching D1 stats:', error);
        return {
            database_id: DATABASE_ID,
            database_name: "zedtopvibes-db",
            error: error.message,
            metrics_available: false
        };
    }
}