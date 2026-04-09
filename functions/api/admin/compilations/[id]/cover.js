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
    const compilationId = params.id;
    const formData = await request.formData();
    const cover = formData.get('cover');

    if (!cover) {
      return new Response(JSON.stringify({ error: 'No cover image uploaded' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if compilation exists and get slug
    const compilation = await env.DB.prepare(
      'SELECT slug FROM compilations WHERE id = ? AND deleted_at IS NULL'
    ).bind(compilationId).first();

    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate filename (matching playlist pattern)
    const extension = cover.name.split('.').pop();
    const timestamp = Date.now();
    const filename = `compilations/${compilation.slug}-${timestamp}.${extension}`;

    // Upload to R2 (using AUDIO bucket)
    await env.AUDIO.put(filename, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type }
    });

    // Generate URL - using compilation-cover endpoint
    const coverUrl = `/api/compilation-cover/${compilation.slug}-${timestamp}.${extension}`;

    // Update database
    await env.DB.prepare(
      'UPDATE compilations SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(coverUrl, compilationId).run();

    return new Response(JSON.stringify({ 
      success: true, 
      cover_url: coverUrl,
      message: 'Cover uploaded successfully'
    }), { headers: { ...headers, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error uploading cover:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}