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
    const playlistId = params.id;
    const formData = await request.formData();
    const cover = formData.get('cover');

    if (!cover) {
      return new Response(JSON.stringify({ error: 'No cover image uploaded' }), { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Check if playlist exists and get slug
    const playlist = await env.DB.prepare(
      'SELECT slug FROM playlists WHERE id = ?'
    ).bind(playlistId).first();

    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { 
        status: 404, 
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Generate filename
    const extension = cover.name.split('.').pop();
    const filename = `playlists/${playlist.slug}-${Date.now()}.${extension}`;

    // Upload to R2
    await env.AUDIO.put(filename, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type }
    });

    // Generate URL
    const coverUrl = `/api/playlist-cover/${filename.replace('playlists/', '')}`;

    // Update database
    await env.DB.prepare(
      'UPDATE playlists SET cover_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(coverUrl, playlistId).run();

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