export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Respond immediately - don't wait for database
  const response = new Response(JSON.stringify({ success: true }), { headers });
  
  // Do database update in background after response is sent
  context.waitUntil(
    env.DB.prepare('UPDATE tracks SET plays = plays + 1 WHERE id = ?')
      .bind(params.id)
      .run()
      .catch(e => console.error('Play tracking failed:', e))
  );
  
  return response;
}