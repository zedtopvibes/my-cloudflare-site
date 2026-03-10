export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const artist = formData.get('artist');
    const description = formData.get('description') || '';
    const genre = formData.get('genre') || 'unknown';
    const duration = parseInt(formData.get('duration')) || 0;

    // Validate required fields
    if (!file || !title || !artist) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      return new Response(JSON.stringify({ 
        error: 'File must be an audio file' 
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${timestamp}-${safeTitle}.mp3`;
    const r2Key = `audio/${filename}`;

    // Upload to R2
    await env.AUDIO.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${filename}"`,
      },
      customMetadata: {
        title,
        artist,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Insert into D1
    const result = await env.DB.prepare(`
      INSERT INTO tracks (title, artist, description, r2_key, filename, genre, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(title, artist, description, r2Key, filename, genre, duration).run();

    const trackId = result.results[0]?.id;

    return new Response(JSON.stringify({ 
      success: true, 
      id: trackId,
      message: 'Track uploaded successfully',
      r2Key,
      filename
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Upload failed' 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
  }
}