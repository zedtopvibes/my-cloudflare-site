// /functions/api/admin/usage-stats.js
// Get R2 + D1 usage statistics

export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const R2_TOKEN = env.CF_API_TOKEN;      // Your existing R2 token
        const D1_TOKEN = env.D1_API_TOKEN;       // Your new D1 token
        
        // Get R2 stats
        const r2Stats = await getR2Stats(ACCOUNT_ID, R2_TOKEN);
        
        // Get D1 stats
        const d1Stats = await getD1Stats(ACCOUNT_ID, D1_TOKEN);
        
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
            console.log('D1 API error:', data.errors);
            return {
                database_id: DATABASE_ID,
                database_name: "zedtopvibes-db",
                metrics_available: false,
                error_message: data.errors?.[0]?.message || 'Permission denied',
                required_permission: "Account → D1 → Read"
            };
        }
        
        const metrics = data.result;
        const sizeBytes = metrics.databaseSizeBytes || 0;
        const sizeGB = sizeBytes / (1024 * 1024 * 1024);
        const freeLimit = 5;
        
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
            free_tier_limit_gb: freeLimit,
            remaining_free_gb: Math.max(0, freeLimit - sizeGB).toFixed(2),
            exceeded_free_tier: sizeGB > freeLimit,
            estimated_monthly_cost: Math.max(0, (sizeGB - freeLimit) * 0.75).toFixed(2)
        };
        
    } catch (error) {
        console.error('Error fetching D1 stats:', error);
        return {
            database_id: DATABASE_ID,
            database_name: "zedtopvibes-db",
            metrics_available: false,
            error_message: error.message
        };
    }
}