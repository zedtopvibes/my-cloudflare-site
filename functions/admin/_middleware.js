export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    let path = url.pathname;
    
    // Only process /admin/ paths
    if (!path.startsWith('/admin/')) {
        return next();
    }
    
    // Handle clean URLs (no .html) and .html URLs
    let fragmentPath = path;
    let originalPath = path;
    
    // If path doesn't end with .html, try adding it
    if (!path.endsWith('.html')) {
        // For clean URL like /admin/upload
        fragmentPath = path + '.html';
        originalPath = path + '.html';
    }
    
    // Build fragment file path
    let fragmentFilePath = '/admin/_fragments' + fragmentPath.replace('/admin', '');
    
    try {
        // Try to read the fragment
        const fragment = await env.ASSETS.fetch(new Request(fragmentFilePath));
        
        if (!fragment.ok) {
            // Fragment doesn't exist, serve original file
            return next();
        }
        
        let fragmentHtml = await fragment.text();
        
        // Extract heading from comment <!-- HEADING: ... -->
        let heading = 'Admin';
        const headingMatch = fragmentHtml.match(/<!-- HEADING:\s*(.+?)\s*-->/);
        if (headingMatch) {
            heading = headingMatch[1];
            fragmentHtml = fragmentHtml.replace(/<!-- HEADING:.+?-->/, '');
        }
        
        // Read layout files
        const headerTemplate = await env.ASSETS.fetch(new URL('/admin/_layout/header.html', url));
        let tabsTemplate = await env.ASSETS.fetch(new URL('/admin/_layout/tabs.html', url));
        const footerTemplate = await env.ASSETS.fetch(new URL('/admin/_layout/footer.html', url));
        
        let headerHtml = await headerTemplate.text();
        let tabsHtml = await tabsTemplate.text();
        let footerHtml = await footerTemplate.text();
        
        // Determine the full path for active tab detection
        let fullPath = path;
        if (!fullPath.endsWith('.html') && !fullPath.endsWith('/')) {
            fullPath = fullPath + '.html';
        }
        if (fullPath === '/admin/' || fullPath === '/admin') {
            fullPath = '/admin/index.html';
        }
        
        // Add active class to current tab
        tabsHtml = tabsHtml.replace(/href="([^"]+)"/g, (match, href) => {
            const isActive = (href === fullPath) || 
                           (fullPath === '/admin/index.html' && href === '/admin/') ||
                           (fullPath === '/admin/' && href === '/admin/');
            
            if (isActive) {
                return match + ' class="tab-btn active"';
            }
            return match;
        });
        
        // Combine everything
        const fullHtml = headerHtml.replace('{{HEADING}}', heading) + 
                        tabsHtml + 
                        fragmentHtml + 
                        footerHtml;
        
        return new Response(fullHtml, {
            headers: { 'Content-Type': 'text/html' }
        });
        
    } catch (error) {
        console.error('Middleware error:', error);
        return next();
    }
}