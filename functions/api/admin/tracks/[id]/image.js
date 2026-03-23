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
    return new Response('Method not allowed', { status: 405, headers });
  }

  try {
    const trackId = params.id;
    const formData = await request.formData();
    const imageFile = formData.get('image');
    const existingFilename = formData.get('existing_filename');
    
    if (!imageFile || !imageFile.size) {
      return new Response(JSON.stringify({ error: 'No image provided' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    if (!imageFile.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Get track info
    const track = await env.DB.prepare(`
      SELECT id, title, artwork_url FROM tracks WHERE id = ?
    `).bind(parseInt(trackId)).first();

    if (!track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json', ...headers } });
    }

    // Determine filename to use
    let filename;
    let artworkUrl;
    
    // If existing filename provided, use it (overwrite)
    if (existingFilename) {
      filename = `covers/${existingFilename}`;
      artworkUrl = `/api/cover/${existingFilename}`;
      console.log('Overwriting existing file:', filename);
    } else {
      // Generate new filename
      let artworkExt = imageFile.type.split('/')[1] || 'jpg';
      if (artworkExt === 'jpeg') artworkExt = 'jpg';
      
      const safeTitle = track.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const timestamp = Date.now();
      filename = `covers/${timestamp}-${safeTitle}.${artworkExt}`;
      artworkUrl = `/api/cover/${timestamp}-${safeTitle}.${artworkExt}`;
      console.log('Creating new file:', filename);
    }
    
    // Upload to R2
    await env.AUDIO.put(filename, await imageFile.arrayBuffer(), {
      httpMetadata: {
        contentType: imageFile.type
      }
    });
    
    // Update database
    await env.DB.prepare(`
      UPDATE tracks SET artwork_url = ? WHERE id = ?
    `).bind(artworkUrl, trackId).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      artwork_url: artworkUrl 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...headers } 
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...headers } });
  }
}