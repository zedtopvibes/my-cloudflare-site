export async function onRequest(context) {
    const { request, env, params } = context;
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    
    const id = params.id;
    
    // GET - Fetch single page
    if (request.method === 'GET') {
        try {
            const page = await env.DB.prepare(`
                SELECT id, title, slug, content, status, created_at, updated_at
                FROM pages WHERE id = ? AND deleted_at IS NULL
            `).bind(id).first();
            
            if (!page) {
                return new Response(JSON.stringify({ error: 'Page not found' }), { 
                    status: 404, 
                    headers 
                });
            }
            
            return new Response(JSON.stringify(page), { headers });
            
        } catch (error) {
            console.error('Error fetching page:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    // PUT - Update page
    if (request.method === 'PUT') {
        try {
            const { title, slug, content, status } = await request.json();
            
            if (!title || !slug) {
                return new Response(JSON.stringify({ error: 'Title and slug are required' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            // Check if slug already exists for different page
            const existing = await env.DB.prepare(`
                SELECT id FROM pages WHERE slug = ? AND id != ? AND deleted_at IS NULL
            `).bind(slug, id).first();
            
            if (existing) {
                return new Response(JSON.stringify({ error: 'Slug already exists' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            await env.DB.prepare(`
                UPDATE pages 
                SET title = ?, slug = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(title, slug, content || null, status || 'draft', id).run();
            
            const updated = await env.DB.prepare(`
                SELECT id, title, slug, content, status, created_at, updated_at
                FROM pages WHERE id = ?
            `).bind(id).first();
            
            return new Response(JSON.stringify(updated), { headers });
            
        } catch (error) {
            console.error('Error updating page:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    // DELETE - Soft delete page
    if (request.method === 'DELETE') {
        try {
            const page = await env.DB.prepare(`
                SELECT id FROM pages WHERE id = ? AND deleted_at IS NULL
            `).bind(id).first();
            
            if (!page) {
                return new Response(JSON.stringify({ error: 'Page not found' }), { 
                    status: 404, 
                    headers 
                });
            }
            
            await env.DB.prepare(`
                UPDATE pages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(id).run();
            
            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Page moved to trash'
            }), { headers });
            
        } catch (error) {
            console.error('Error deleting page:', error);
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