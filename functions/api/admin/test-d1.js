// /functions/api/admin/test-d1.js
export async function onRequest(context) {
    const { env } = context;
    const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
    const D1_TOKEN = env.D1_API_TOKEN;
    const DATABASE_ID = "73f2a3ac-0d13-454b-9e77-36d5a78c1762";

    if (!ACCOUNT_ID || !D1_TOKEN) {
        return Response.json({ error: "Missing config" }, { status: 500 });
    }

    try {
        // 1. Fetch Metadata (Current Size/Tables)
        const dbMetaReq = fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`, {
            headers: { "Authorization": `Bearer ${D1_TOKEN}` }
        });

        // 2. Fetch Usage Stats (GraphQL)
        // This query gets the sum of rows read/written for the last 7 days
        const graphqlQuery = {
            query: `
                query getD1Stats($accountId: String!, $databaseId: String!) {
                    viewer {
                        accounts(filter: { accountTag: $accountId }) {
                            d1AnalyticsAdaptiveGroups(
                                filter: { databaseId: $databaseId },
                                limit: 1
                            ) {
                                sum {
                                    rowsRead
                                    rowsWritten
                                    storageReadUnits
                                    storageWriteUnits
                                }
                            }
                        }
                    }
                }
            `,
            variables: { accountId: ACCOUNT_ID, databaseId: DATABASE_ID }
        };

        const dbStatsReq = fetch(`https://api.cloudflare.com/client/v4/graphql`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${D1_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(graphqlQuery)
        });

        // Run both requests in parallel
        const [metaRes, statsRes] = await Promise.all([dbMetaReq, dbStatsReq]);
        
        const metaData = await metaRes.json();
        const statsData = await statsRes.json();

        // Extract the sums safely
        const usage = statsData.data?.viewer?.accounts[0]?.d1AnalyticsAdaptiveGroups[0]?.sum || {};

        return Response.json({
            name: metaData.result.name,
            current_state: {
                size_bytes: metaData.result.file_size,
                tables: metaData.result.num_tables,
                region: metaData.result.running_in_region
            },
            usage_totals: {
                rows_read: usage.rowsRead || 0,
                rows_written: usage.rowsWritten || 0,
                storage_read_units: usage.storageReadUnits || 0,
                storage_write_units: usage.storageWriteUnits || 0
            }
        });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
