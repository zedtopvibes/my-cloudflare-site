export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    
    // ✅ Skip empty slug (root path /)
    if (!slug || slug === '') {
        return context.next();
    }
    
    // Skip API routes
    if (slug === 'api') {
        return context.next();
    }
    
    // Skip admin routes
    if (slug === 'admin') {
        return context.next();
    }
    
    // Skip existing content routes (song, album, ep, artist, playlist)
    const contentRoutes = ['song', 'album', 'ep', 'artist', 'playlist', 'page'];
    if (contentRoutes.includes(slug)) {
        return context.next();
    }
    
    // Skip static files with extensions
    if (slug.includes('.') && !slug.endsWith('.html')) {
        return context.next();
    }
    
    try {
        // Fetch page from database
        const page = await env.DB.prepare(`
            SELECT id, title, content, updated_at 
            FROM pages 
            WHERE slug = ? AND deleted_at IS NULL AND status = 'published'
        `).bind(slug).first();
        
        if (!page) {
            return new Response('Page not found', { 
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        // Format date
        const updatedDate = new Date(page.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Return HTML page
        return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(page.title)} - ZEDTOPVIBES</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary: #1e3c72;
            --primary-light: #2a4a8a;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            --radius-lg: 12px;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: var(--gray-50);
            color: var(--gray-800);
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: var(--radius-lg);
            padding: 24px 32px;
            margin-bottom: 30px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--gray-200);
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 8px;
        }
        
        .header .meta {
            font-size: 0.85rem;
            color: var(--gray-600);
        }
        
        .content {
            background: white;
            border-radius: var(--radius-lg);
            padding: 32px;
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--gray-200);
        }
        
        .content h1 {
            font-size: 1.8rem;
            margin-bottom: 16px;
            color: var(--gray-800);
        }
        
        .content h2 {
            font-size: 1.4rem;
            margin: 24px 0 12px;
            color: var(--gray-800);
        }
        
        .content h3 {
            font-size: 1.2rem;
            margin: 20px 0 10px;
            color: var(--gray-800);
        }
        
        .content p {
            margin-bottom: 16px;
            color: var(--gray-700);
        }
        
        .content ul, .content ol {
            margin: 16px 0 16px 32px;
        }
        
        .content li {
            margin-bottom: 8px;
        }
        
        .content a {
            color: var(--primary);
            text-decoration: none;
        }
        
        .content a:hover {
            text-decoration: underline;
        }
        
        .back-link {
            display: inline-block;
            margin-top: 24px;
            color: var(--primary);
            text-decoration: none;
        }
        
        .back-link:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 640px) {
            .container {
                padding: 12px;
            }
            
            .content {
                padding: 20px;
            }
            
            .header {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${escapeHtml(page.title)}</h1>
            <div class="meta">
                <i class="fas fa-calendar-alt"></i> Updated: ${updatedDate}
            </div>
        </div>
        <div class="content">
            ${page.content || '<p>No content yet.</p>'}
            <a href="/" class="back-link"><i class="fas fa-arrow-left"></i> Back to Home</a>
        </div>
    </div>
</body>
</html>`, {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (error) {
        console.error('Error loading page:', error);
        return new Response(`<!DOCTYPE html>
<html>
<head><title>Error - ZEDTOPVIBES</title></head>
<body>
    <div style="text-align: center; padding: 60px;">
        <h2>Something went wrong</h2>
        <p>Please try again later.</p>
        <a href="/">Back to Home</a>
    </div>
</body>
</html>`, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}