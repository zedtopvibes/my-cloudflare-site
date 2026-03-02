export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'tracks';
    const period = url.searchParams.get('period') || 'week';
    
    let query = '';
    let params = [];
    
    // Calculate date based on period
    let dateCondition = '';
    if (period === 'week') {
      dateCondition = "uploaded_at > DATE('now', '-7 days')";
    } else if (period === 'month') {
      dateCondition = "uploaded_at > DATE('now', '-30 days')";
    } else if (period === 'year') {
      dateCondition = "uploaded_at > DATE('now', '-365 days')";
    } else {
      dateCondition = "1=1"; // all time
    }
    
    // Build query based on type
    if (type === 'tracks') {
      query = `
        SELECT 
          id,
          title,
          artist,
          artwork_url,
          plays,
          views,
          downloads,
          slug,
          uploaded_at
        FROM tracks 
        WHERE ${dateCondition}
        ORDER BY plays DESC 
        LIMIT 20
      `;
    } 
    else if (type === 'artists') {
      query = `
        SELECT 
          name,
          slug,
          image_url,
          total_plays,
          total_tracks,
          total_downloads,
          country,
          is_zambian_legend
        FROM artists 
        ORDER BY total_plays DESC 
        LIMIT 20
      `;
    } 
    else if (type === 'albums') {
      // For albums, use release_date instead of uploaded_at
      let albumDateCondition = dateCondition.replace('uploaded_at', 'release_date');
      query = `
        SELECT 
          id,
          title,
          artist,
          cover_url,
          plays,
          views,
          downloads,
          slug,
          release_date
        FROM albums 
        WHERE ${albumDateCondition}
        ORDER BY plays DESC 
        LIMIT 20
      `;
    }
    else if (type === 'trending') {
      // Trending = high plays in short time
      query = `
        SELECT 
          id,
          title,
          artist,
          artwork_url,
          plays,
          views,
          slug,
          uploaded_at
        FROM tracks 
        WHERE uploaded_at > DATE('now', '-3 days')
        ORDER BY plays DESC 
        LIMIT 10
      `;
    }
    else {
      return new Response(JSON.stringify({ error: 'Invalid type' }), { 
        status: 400, 
        headers 
      });
    }

    const { results } = await env.DB.prepare(query).all();
    
    return new Response(JSON.stringify({
      type,
      period,
      data: results || []
    }), { headers });
    
  } catch (error) {
    console.error('Charts error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}