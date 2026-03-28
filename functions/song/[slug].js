export async function onRequest(context) {
  const { request, env, params } = context;
  
  try {
    const slug = params.slug;
    
    // Get the song data
    const apiUrl = new URL(request.url);
    const apiReq = new Request(
      `${apiUrl.origin}/api/song/by-slug/${slug}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    
    const apiResponse = await fetch(apiReq);
    
    if (!apiResponse.ok) {
      return new Response('Song not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    const song = await apiResponse.json();
    
    // Increment views
    if (song && song.id) {
      env.DB.prepare(`
        UPDATE tracks SET views = views + 1 WHERE id = ?
      `).bind(song.id).run().catch(e => console.error('Error updating track views:', e));
    }
    
    const htmlResponse = await env.ASSETS.fetch(new URL('/song.html', request.url));
    let html = await htmlResponse.text();
    
    html = html.replace(
      '<div class="main-content-container" id="content">',
      `<div class="main-content-container" id="content" data-song-slug="${slug}">`
    );
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('Error serving song page:', error);
    return new Response('Error loading song', { status: 500 });
  }
}