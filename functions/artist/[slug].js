export async function onRequest(context) {
  const { request, params } = context;
  
  return new Response(JSON.stringify({
    message: "Route handler is working!",
    slug: params.slug,
    url: request.url
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}