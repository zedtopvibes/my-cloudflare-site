export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const id = params.id;
    const formData = await request.formData();
    const file = formData.get('cover');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
        status: 400, 
        headers 
      });
    }

    // Check if album exists
    const album = await env.DB.prepare(
      'SELECT slug FROM albums WHERE id = ?'
    ).bind(id).first();

    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
        status: 404, 
        headers 
      });
    }

    // Generate filename
    const extension = file.name.split('.').pop();
    const filename = `${album.slug}-${Date.now()}.${extension}`;
    const r2Key = `albums/${filename}`;

    // Upload to R2
    await env.IMAGES.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    // Update database with cover URL
    const coverUrl = `https://pub-${env.IMAGES_ID}.r2.dev/${r2Key}`; // Adjust this URL format
    await env.DB.prepare(
      'UPDATE albums SET cover_url = ? WHERE id = ?'
    ).bind(coverUrl, id).run();

    return new Response(JSON.stringify({ 
      success: true, 
      cover_url: coverUrl 
    }), { headers });

  } catch (error) {
    console.error('Error uploading cover:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}