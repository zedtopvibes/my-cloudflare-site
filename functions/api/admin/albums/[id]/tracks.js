export async function onRequest(context) {
  return new Response(JSON.stringify({ 
    message: "API is working",
    method: context.request.method,
    params: context.params
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}