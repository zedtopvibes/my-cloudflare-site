export async function sendVerificationEmail(env, email, verificationToken, userName = 'User') {
  const siteUrl = 'https://zedtopvibes.com';
  const verificationUrl = `${siteUrl}/api/auth/verify?token=${verificationToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎵 ZedTopVibes</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Thanks for signing up! Please verify your email address to continue.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; display: inline-block;">Verify Email →</a>
          </div>
          <p style="font-size: 12px; color: #999;">This link expires in 24 hours.</p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">If you didn't create an account, please ignore this email.</p>
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
      subject: 'Verify your email address - ZedTopVibes 🎵',
      html: html
    })
  });
  
  return await response.json();
}