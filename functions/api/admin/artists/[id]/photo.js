export async function onRequest(context) {
  const { request, env, params } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  try {
    const artistId = params.id;
    const formData = await request.formData();
    const photo = formData.get('photo');

    if (!photo) {
      return new Response(JSON.stringify({ error: 'No photo uploaded' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if artist exists
    const artist = await env.DB.prepare(
      'SELECT slug FROM artists WHERE id = ?'
    ).bind(artistId).first();

    if (!artist) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate filename
    const extension = photo.name.split('.').pop();
    const filename = `artists/${artist.slug}-${Date.now()}.${extension}`;

    // Upload to R2 using AUDIO binding
    await env.AUDIO.put(filename, await photo.arrayBuffer(), {
      httpMetadata: { contentType: photo.type }
    });

    // Generate public URL - you need to get your R2 public URL
    // Option 1: If you have public access enabled
    const imageUrl = `https://pub-${env.AUDIO.id}.r2.dev/${filename}`;
    
    // Option 2: If you have a custom domain
    // const imageUrl = `https://cdn.yourdomain.com/${filename}`;
    
    // Option 3: If you're not sure, we'll store the key and create a serve endpoint
    // For now, let's use the key and we'll create a serve endpoint later
    const imageUrl = `/api/artist-image/${filename}`;

    // Update database with image URL
    await env.DB.prepare(
      'UPDATE artists SET image_url = ? WHERE id = ?'
    ).bind(imageUrl, artistId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      image_url: imageUrl,
      message: 'Photo uploaded successfully'
    }), { headers: { ...headers, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error uploading photo:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}