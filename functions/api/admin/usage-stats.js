// /functions/api/admin/usage-stats.js
// Get R2 + D1 usage statistics

export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const R2_TOKEN = env.CF_API_TOKEN;
        const D1_TOKEN = env.D1_API_TOKEN;
        const BUCKET_NAME = "zedtopvibes-audio";
        const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";
        
        // Get R2 stats
        const r2Stats = await getR2Stats(ACCOUNT_ID, R2_TOKEN, BUCKET_NAME);
        
        // Get D1 stats
        const d1Stats = await getD1Stats(ACCOUNT_ID, D1_TOKEN, DATABASE_ID);
        
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

async function getR2Stats(accountId, apiToken, bucketName) {
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/usage`,
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

async function getD1Stats(accountId, apiToken, databaseId) {
    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`,
            {
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        
        const data = await response.json();
        
        if (!data.success) {
            return {
                database_id: databaseId,
                metrics_available: false,
                error_message: data.errors?.[0]?.message || 'Failed to fetch D1 info'
            };
        }
        
        const result = data.result;
        const sizeBytes = result.file_size || 0;
        const sizeGB = sizeBytes / (1024 * 1024 * 1024);
        const sizeMB = sizeBytes / (1024 * 1024);
        const freeLimit = 5;
        
        return {
            database_id: databaseId,
            database_name: result.name || "zedtopvibes-db",
            metrics_available: true,
            created_at: result.created_at,
            version: result.version,
            region: result.running_in_region,
            num_tables: result.num_tables || 0,
            database_size_bytes: sizeBytes,
            database_size_mb: sizeMB.toFixed(2),
            database_size_gb: sizeGB.toFixed(4),
            free_tier_limit_gb: freeLimit,
            remaining_free_gb: Math.max(0, freeLimit - sizeGB).toFixed(4),
            exceeded_free_tier: sizeGB > freeLimit,
            estimated_monthly_cost: Math.max(0, (sizeGB - freeLimit) * 0.75).toFixed(4)
        };
        
    } catch (error) {
        console.error('Error fetching D1 stats:', error);
        return {
            database_id: databaseId,
            metrics_available: false,
            error_message: error.message
        };
    }
}