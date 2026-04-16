export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { email } = await request.json();
    
    // Beautiful HTML design for test email
    const htmlDesign = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; }
          .header h1 { color: white; margin: 0; }
          .content { padding: 40px; text-align: center; }
          .button { background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 ZedTopVibes</h1>
          </div>
          <div class="content">
            <h2>✅ Success!</h2>
            <p>Your Resend integration is working perfectly!</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">Sent at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'verify@zedtopvibes.com',
        to: email,
        subject: '✅ Test Successful - ZedTopVibes',
        html: htmlDesign
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