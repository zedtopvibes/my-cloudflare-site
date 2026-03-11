// GET - Load settings
export async function onRequest(context) {
    const { request, env } = context;
    const userId = request.headers.get('X-User-ID') || 'default_admin';
    
    if (request.method === 'GET') {
        try {
            const { results } = await env.DB.prepare(
                "SELECT show_albums, show_playlists, show_bpm, show_options FROM user_preferences WHERE user_id = ?"
            ).bind(userId).all();
            
            // If no row exists, return defaults
            if (results.length === 0) {
                return new Response(JSON.stringify({
                    showAlbums: true,
                    showPlaylists: true,
                    showBPM: true,
                    showOptions: true
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const row = results[0];
            return new Response(JSON.stringify({
                showAlbums: row.show_albums === 1,
                showPlaylists: row.show_playlists === 1,
                showBPM: row.show_bpm === 1,
                showOptions: row.show_options === 1
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
    
    // POST - Save settings (updates the SAME row)
    if (request.method === 'POST') {
        try {
            const settings = await request.json();
            
            // Convert booleans to integers
            const showAlbums = settings.showAlbums ? 1 : 0;
            const showPlaylists = settings.showPlaylists ? 1 : 0;
            const showBPM = settings.showBPM ? 1 : 0;
            const showOptions = settings.showOptions ? 1 : 0;
            
            // Insert or replace the single row
            await env.DB.prepare(
                `INSERT INTO user_preferences 
                (user_id, show_albums, show_playlists, show_bpm, show_options, updated_at) 
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET 
                    show_albums = excluded.show_albums,
                    show_playlists = excluded.show_playlists,
                    show_bpm = excluded.show_bpm,
                    show_options = excluded.show_options,
                    updated_at = CURRENT_TIMESTAMP`
            ).bind(userId, showAlbums, showPlaylists, showBPM, showOptions).run();
            
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
    
    return new Response('Method not allowed', { status: 405 });
}