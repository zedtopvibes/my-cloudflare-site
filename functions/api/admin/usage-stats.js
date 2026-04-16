export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const BUCKET_NAME = "AUDIO";
        const API_TOKEN = env.CF_API_TOKEN;
        
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET_NAME}/usage`,
            {
                headers: {
                    "Authorization": `Bearer ${API_TOKEN}`,
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