export async function onRequest(context) {
  const { request, env, params } = context;
  
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
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST.' 
    }), { 
      status: 405, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  try {
    const artistId = params.id;
    
    // Parse form data
    const formData = await request.formData();
    const photo = formData.get('photo');

    // Validate photo
    if (!photo) {
      return new Response(JSON.stringify({ 
        error: 'No photo uploaded' 
      }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(photo.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Please upload JPEG, PNG, WEBP, or GIF.' 
      }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photo.size > maxSize) {
      return new Response(JSON.stringify({ 
        error: 'File too large. Maximum size is 5MB.' 
      }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if artist exists and get slug
    const artist = await env.DB.prepare(
      'SELECT slug FROM artists WHERE id = ?'
    ).bind(artistId).first();

    if (!artist) {
      return new Response(JSON.stringify({ 
        error: 'Artist not found' 
      }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate clean filename
    const extension = photo.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const cleanSlug = artist.slug.replace(/[^a-z0-9-]/g, '');
    const filename = `artists/${cleanSlug}-${timestamp}.${extension}`;

    console.log('Uploading image:', filename);

    // Upload to R2 using AUDIO binding
    await env.AUDIO.put(filename, await photo.arrayBuffer(), {
      httpMetadata: { 
        contentType: photo.type,
        cacheControl: 'public, max-age=31536000'
      }
    });

    // Store clean URL without 'artists/' prefix for consistency
    const cleanFilename = filename.replace('artists/', '');
    const imageUrl = `/api/artist-image/${cleanFilename}`;

    // Update database with new image URL
    await env.DB.prepare(
      'UPDATE artists SET image_url = ? WHERE id = ?'
    ).bind(imageUrl, artistId).run();

    console.log('Image uploaded successfully:', imageUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      image_url: imageUrl,
      message: 'Photo uploaded successfully'
    }), { 
      status: 200, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error uploading photo:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to upload photo'
    }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}