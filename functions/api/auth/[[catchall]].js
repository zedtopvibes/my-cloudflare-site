export async function onRequest() {
  const headers = {
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json'
  };
  
  return new Response(JSON.stringify({ error: 'Auth endpoint not found' }), {
    status: 404,
    headers
  });
}