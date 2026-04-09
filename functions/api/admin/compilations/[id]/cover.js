export async function onRequest(context) {
  const { request, env, params } = context;
  const id = params.id;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
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
    const formData = await request.formData();
    const imageFile = formData.get('cover');
    
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No image file provided' }), { 
        status: 400, 
        headers 
      });
    }

    const compilation = await env.DB.prepare(
      'SELECT id FROM compilations WHERE id = ? AND deleted_at IS NULL'
    ).bind(id).first();
    
    if (!compilation) {
      return new Response(JSON.stringify({ error: 'Compilation not found' }), { 
        status: 404, 
        headers 
      });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = imageFile.name.split('.').pop();
    const filename = `compilation_${id}_${timestamp}_${randomString}.${extension}`;
    
    const fileBuffer = await imageFile.arrayBuffer();
    await env.MY_BUCKET.put(filename, fileBuffer, {
      httpMetadata: { contentType: imageFile.type }
    });
    
    const coverUrl = `/api/cover/${filename}`;
    
    await env.DB.prepare(`
      UPDATE compilations SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(coverUrl, id).run();
    
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