export async function sendVerificationCode(env, email, code, userName = 'User') {
  const siteUrl = 'https://zedtopvibes.com'; 
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Verification Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎵 ZedTopVibes</h1>
        </div>
        <div style="padding: 40px; text-align: center;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #333;">Your verification code is:</p>
          <div style="font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 10px; margin: 30px 0;">${code}</div>
          <p style="font-size: 14px; color: #666;">This code expires in 15 minutes.</p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
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
      from: 'ZedTopVibes <verify@zedtopvibes.com>',
      to: email,
      subject: 'Your verification code - ZedTopVibes 🎵',
      html: html
    })
  });
  
  return await response.json();
}