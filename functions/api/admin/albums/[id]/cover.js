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
    const albumId = params.id;
    const formData = await request.formData();
    const cover = formData.get('cover');

    if (!cover) {
      return new Response(JSON.stringify({ error: 'No cover image uploaded' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if album exists and get slug
    const album = await env.DB.prepare(
      'SELECT slug FROM albums WHERE id = ?'
    ).bind(albumId).first();

    if (!album) {
      return new Response(JSON.stringify({ error: 'Album not found' }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate filename
    const extension = cover.name.split('.').pop();
    const filename = `albums/${album.slug}-${Date.now()}.${extension}`;

    // Upload to R2 using AUDIO binding (same as artists)
    await env.AUDIO.put(filename, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type }
    });

    // Store the URL in the same format as your existing album
    // Using /images/albums/ path to match your database
    const coverUrl = `/images/albums/${filename.split('/').pop()}`;

    // Update database
    await env.DB.prepare(
      'UPDATE albums SET cover_url = ? WHERE id = ?'
    ).bind(coverUrl, albumId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      cover_url: coverUrl 
    }), { headers: { ...headers, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error uploading cover:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}