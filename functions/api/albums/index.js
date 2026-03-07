export async function onRequest(context) {
  const { request, env } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // Get all albums
    const albums = await env.DB.prepare(`
      SELECT * FROM albums ORDER BY created_at DESC
    `).all();
    
    // For each album, get its tracks (SAME AS PLAYLISTS APPROACH)
    const albumsWithTracks = await Promise.all(
      albums.results.map(async (album) => {
        const tracks = await env.DB.prepare(`
          SELECT t.*, at.track_number 
          FROM tracks t
          JOIN album_tracks at ON t.id = at.track_id
          WHERE at.album_id = ?
          ORDER BY at.track_number
        `).bind(album.id).all();
        
        return {
          ...album,
          tracks: tracks.results,
          track_count: tracks.results.length
        };
      })
    );
    
    return new Response(JSON.stringify(albumsWithTracks), { headers });

  } catch (error) {
    console.error('Error fetching albums:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}