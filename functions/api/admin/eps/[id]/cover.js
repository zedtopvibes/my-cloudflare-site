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
    const epId = params.id;
    const formData = await request.formData();
    const cover = formData.get('cover');

    if (!cover) {
      return new Response(JSON.stringify({ error: 'No cover image uploaded' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if EP exists and get slug
    const ep = await env.DB.prepare(
      'SELECT slug FROM eps WHERE id = ?'
    ).bind(epId).first();

    if (!ep) {
      return new Response(JSON.stringify({ error: 'EP not found' }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate filename
    const extension = cover.name.split('.').pop();
    const filename = `eps/${ep.slug}-${Date.now()}.${extension}`;

    // Upload to R2 using AUDIO binding (same as artists)
    await env.AUDIO.put(filename, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type }
    });

    // Store the URL in the same format as your existing EP
    // Using /images/eps/ path to match your database
    const coverUrl = `/images/eps/${filename.split('/').pop()}`;

    // Update database
    await env.DB.prepare(
      'UPDATE eps SET cover_url = ? WHERE id = ?'
    ).bind(coverUrl, epId).run();

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