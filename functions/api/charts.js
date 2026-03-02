export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'tracks';
    const period = url.searchParams.get('period') || 'week';
    
    let results;
    
    // Calculate date based on period
    const dateCondition = period === 'week' 
      ? "uploaded_at > DATE('now', '-7 days')"
      : period === 'month'
        ? "uploaded_at > DATE('now', '-30 days')"
        : "1=1"; // all time
    
    if (type === 'tracks') {
      // Top tracks chart
      results = await env.DB.prepare(`
        SELECT 
          id,
          title,
          artist,
          artwork_url,
          plays,
          views,
          slug
        FROM tracks 
        WHERE ${dateCondition}
        ORDER BY plays DESC 
        LIMIT 20
      `).all();
      
    } else if (type === 'artists') {
      // Top artists chart
      results = await env.DB.prepare(`
        SELECT 
          name,
          slug,
          image_url,
          total_plays,
          total_tracks
        FROM artists 
        ORDER BY total_plays DESC 
        LIMIT 20
      `).all();
      
    } else if (type === 'albums') {
      // Top albums chart
      results = await env.DB.prepare(`
        SELECT 
          id,
          title,
          artist,
          cover_url,
          plays,
          views,
          slug
        FROM albums 
        WHERE ${dateCondition.replace('uploaded_at', 'release_date')}
        ORDER BY plays DESC 
        LIMIT 20
      `).all();
    }
    
    return new Response(JSON.stringify(results.results || []), { headers });
    
  } catch (error) {
    console.error('Charts error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}