export async function onRequest(context) {
    const { env } = context;
    
    const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
    const D1_TOKEN = env.D1_API_TOKEN;
    const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";
    
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`,
        {
            headers: {
                "Authorization": `Bearer ${D1_TOKEN}`,
                "Content-Type": "application/json",
            },
        }
    );
    
    const data = await response.json();
    
    return Response.json(data);
}