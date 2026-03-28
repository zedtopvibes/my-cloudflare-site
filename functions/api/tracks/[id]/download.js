export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Respond immediately
  const response = new Response(JSON.stringify({ success: true }), { headers });
  
  // Update database in background
  context.waitUntil(
    env.DB.prepare('UPDATE tracks SET downloads = downloads + 1 WHERE id = ?')
      .bind(params.id)
      .run()
      .catch(e => console.error('Download tracking failed:', e))
  );
  
  return response;
}