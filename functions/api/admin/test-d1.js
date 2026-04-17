// /functions/api/admin/test-d1.js
export async function onRequest(context) {
    const { env } = context;
    
    const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
    const D1_TOKEN = env.D1_API_TOKEN;
    // Keep your specific Database ID
    const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";

    // 1. Validation: Ensure secrets are present
    if (!ACCOUNT_ID || !D1_TOKEN) {
        return Response.json({
            success: false,
            error: "Environment variables CLOUDFLARE_ACCOUNT_ID or D1_API_TOKEN are missing."
        }, { status: 500 });
    }

    // 2. Correct URL: Removed "/metrics" as it is not a valid endpoint
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;
    
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${D1_TOKEN}`,
                "Content-Type": "application/json",
            },
        });
        
        const data = await response.json();
        
        // 3. Return a clean combined response
        return Response.json({
            success: data.success,
            config: {
                account_id: ACCOUNT_ID,
                database_id: DATABASE_ID,
                // Only showing the start of the token for safety
                token_preview: D1_TOKEN.substring(0, 10) + "..."
            },
            // This will now contain "file_size", "num_tables", etc.
            database_details: data.result || null,
            errors: data.errors || []
        });

    } catch (err) {
        return Response.json({
            success: false,
            error: "Failed to fetch from Cloudflare API",
            message: err.message
        }, { status: 500 });
    }
}
