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
      headers 
    });
  }

  try {
    const artistId = params.id;
    const formData = await request.formData();
    const photo = formData.get('photo');

    if (!photo) {
      return new Response(JSON.stringify({ error: 'No photo uploaded' }), { 
        status: 400, 
        headers 
      });
    }

    // Check if artist exists
    const artist = await env.DB.prepare(
      'SELECT slug FROM artists WHERE id = ?'
    ).bind(artistId).first();

    if (!artist) {
      return new Response(JSON.stringify({ error: 'Artist not found' }), { 
        status: 404, 
        headers 
      });
    }

    // Generate filename
    const extension = photo.name.split('.').pop();
    const filename = `artists/${artist.slug}-${Date.now()}.${extension}`;

    // Upload to R2 (assuming you have an IMAGES bucket)
    await env.IMAGES.put(filename, await photo.arrayBuffer(), {
      httpMetadata: { contentType: photo.type }
    });

    // Get public URL (adjust this based on your R2 setup)
    const imageUrl = `https://pub-${env.IMAGES_ID}.r2.dev/${filename}`;

    // Update database
    await env.DB.prepare(
      'UPDATE artists SET image_url = ? WHERE id = ?'
    ).bind(imageUrl, artistId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      image_url: imageUrl 
    }), { headers });

  } catch (error) {
    console.error('Error uploading photo:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}