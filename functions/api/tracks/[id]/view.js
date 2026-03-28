export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  // Create response immediately
  const response = new Response(JSON.stringify({ success: true }), { headers });
  
  // Update view count in background after response is sent
  context.waitUntil(
    env.DB.prepare('UPDATE tracks SET views = views + 1 WHERE id = ?')
      .bind(params.id)
      .run()
      .catch(e => console.error('View tracking failed:', e))
  );
  
  return response;
}