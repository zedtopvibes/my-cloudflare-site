export async function onRequest(context) {
    const { request, env } = context;
    
    // Only allow POST with admin auth
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    
    // Check admin authentication
    const authHeader = request.headers.get('Authorization');
    // Simple check - in production use proper auth
    if (!authHeader || authHeader !== 'admin-secret') {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        const { migration } = await request.json();
        const migrations = {
            '001': `
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
            `,
            '002': `
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                );
                
                CREATE TABLE IF NOT EXISTS post_tags (
                    post_id INTEGER,
                    tag_id INTEGER,
                    FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                    PRIMARY KEY (post_id, tag_id)
                );
                
                CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date);
                CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
                CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
            `
        };
        
        if (!migrations[migration]) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: 'Migration not found' 
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Run migration
        await env.DB.exec(migrations[migration]);
        
        // Record migration
        await env.DB.prepare(
            'INSERT INTO migrations (name) VALUES (?)'
        ).bind(`00${migration}_migration.sql`).run();
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: `Migration ${migration} executed successfully` 
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            success: false, 
            message: e.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}