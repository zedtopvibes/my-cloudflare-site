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
    
    // GET - Fetch single genre
    if (request.method === 'GET') {
        try {
            const genre = await env.DB.prepare(`
                SELECT id, name, slug, description, cover_url, is_featured, created_at, updated_at
                FROM genres WHERE id = ? AND deleted_at IS NULL
            `).bind(id).first();
            
            if (!genre) {
                return new Response(JSON.stringify({ error: 'Genre not found' }), { 
                    status: 404, 
                    headers 
                });
            }
            
            // Get stats
            const artistsCount = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM artists 
                WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
            `).bind(genre.name).first();
            
            const albumsCount = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM albums 
                WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
            `).bind(genre.name).first();
            
            const epsCount = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM eps 
                WHERE deleted_at IS NULL AND status = 'published' AND genre = ?
            `).bind(genre.name).first();
            
            return new Response(JSON.stringify({
                ...genre,
                stats: {
                    artists: artistsCount?.count || 0,
                    albums: albumsCount?.count || 0,
                    eps: epsCount?.count || 0,
                    total: (artistsCount?.count || 0) + (albumsCount?.count || 0) + (epsCount?.count || 0)
                }
            }), { headers });
            
        } catch (error) {
            console.error('Error fetching genre:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    // PUT - Update genre
    if (request.method === 'PUT') {
        try {
            const { name, description, cover_url, is_featured } = await request.json();
            
            if (!name) {
                return new Response(JSON.stringify({ error: 'Genre name is required' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            // Generate slug
            const slug = name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '')
                .replace(/--+/g, '-')
                .replace(/^-+|-+$/g, '');
            
            // Check if slug already exists for different genre
            const existing = await env.DB.prepare(`
                SELECT id FROM genres WHERE (name = ? OR slug = ?) AND id != ? AND deleted_at IS NULL
            `).bind(name, slug, id).first();
            
            if (existing) {
                return new Response(JSON.stringify({ error: 'Genre with this name or slug already exists' }), { 
                    status: 400, 
                    headers 
                });
            }
            
            await env.DB.prepare(`
                UPDATE genres 
                SET name = ?, slug = ?, description = ?, cover_url = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(
                name,
                slug,
                description || null,
                cover_url || null,
                is_featured ? 1 : 0,
                id
            ).run();
            
            const updated = await env.DB.prepare(`
                SELECT id, name, slug, description, cover_url, is_featured, created_at, updated_at
                FROM genres WHERE id = ?
            `).bind(id).first();
            
            return new Response(JSON.stringify(updated), { headers });
            
        } catch (error) {
            console.error('Error updating genre:', error);
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers 
            });
        }
    }
    
    // DELETE - Soft delete genre
    if (request.method === 'DELETE') {
        try {
            const genre = await env.DB.prepare(`
                SELECT id FROM genres WHERE id = ? AND deleted_at IS NULL
            `).bind(id).first();
            
            if (!genre) {
                return new Response(JSON.stringify({ error: 'Genre not found' }), { 
                    status: 404, 
                    headers 
                });
            }
            
            await env.DB.prepare(`
                UPDATE genres SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(id).run();
            
            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Genre moved to trash'
            }), { headers });
            
        } catch (error) {
            console.error('Error deleting genre:', error);
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