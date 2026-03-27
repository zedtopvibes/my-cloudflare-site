export async function onRequest(context) {
    const { request, env } = context;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    
    // GET - List all pages (admin - shows all including drafts)
    if (request.method === 'GET') {
        try {
            const { results } = await env.DB.prepare(`
                SELECT id, title, slug, status, created_at, updated_at
                FROM pages 
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
            `).all();
            
            return new Response(JSON.stringify(results), { headers });
        } catch (error) {
            console.error('Error fetching pages:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    // POST - Create new page
    if (request.method === 'POST') {
        try {
            const { title, slug, content, status } = await request.json();
            
            if (!title || !slug) {
                return new Response(JSON.stringify({ error: 'Title and slug are required' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            // Check if slug already exists
            const existing = await env.DB.prepare(`
                SELECT id FROM pages WHERE slug = ? AND deleted_at IS NULL
            `).bind(slug).first();
            
            if (existing) {
                return new Response(JSON.stringify({ error: 'Slug already exists' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            const pageStatus = status || 'draft';
            
            const result = await env.DB.prepare(`
                INSERT INTO pages (title, slug, content, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `).bind(title, slug, content || null, pageStatus).run();
            
            const newPage = await env.DB.prepare(`
                SELECT id, title, slug, content, status, created_at, updated_at
                FROM pages WHERE id = ?
            `).bind(result.results[0].id).first();
            
            return new Response(JSON.stringify(newPage), { 
                status: 201, 
                headers 
            });
            
        } catch (error) {
            console.error('Error creating page:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers 
    });
}