export async function onRequest(context) {
    const { env } = context;
    
    try {
        const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
        const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";
        const API_TOKEN = env.D1_API_TOKEN;  // Your new D1 token
        
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/metrics`,
            {
                headers: {
                    "Authorization": `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );
        
        const data = await response.json();
        
        return Response.json({
            success: data.success,
            account_id: ACCOUNT_ID,
            database_id: DATABASE_ID,
            token_preview: API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : 'No token',
            response: data
        });
        
    } catch (error) {
        console.error('Error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}