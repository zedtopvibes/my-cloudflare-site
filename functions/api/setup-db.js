export async function onRequest(context) {
    const { request, env } = context;
    
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    
    try {
        if (!env.DB) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'DB binding not found'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Create tables
        await env.DB.exec(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                content TEXT,
                image_path TEXT,
                audio_path TEXT,
                date DATE DEFAULT CURRENT_DATE,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                published BOOLEAN DEFAULT 0,
                views INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Record migration
        await env.DB.prepare(
            'INSERT OR IGNORE INTO migrations (name) VALUES (?)'
        ).bind('001_initial_schema.sql').run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Database setup complete!'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: e.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}