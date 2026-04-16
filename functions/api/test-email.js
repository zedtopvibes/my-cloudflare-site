export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { email } = await request.json();
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'verify@zedtopvibes.com',
        to: email,
        subject: 'Test from ZedTopVibes',
        html: '<h1>Success!</h1><p>Your Resend is working!</p>'
      })
    });
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}