export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Only process /admin/ paths that end with .html or have no extension
    if (!path.startsWith('/admin/')) {
        return next();
    }
    
    // Skip if already requesting a fragment or layout file
    if (path.includes('/_fragments/') || path.includes('/_layout/')) {
        return next();
    }
    
    // Build fragment path: /admin/upload.html → /fragments/upload.html
    let fragmentPath = path.replace('/admin/', '/fragments/');
    
    // Also try without .html for clean URLs
    let fragmentPathNoHtml = fragmentPath.replace('.html', '');
    
    try {
        // Try to read the fragment with .html
        let fragment = await env.ASSETS.fetch(new Request(fragmentPath));
        
        // If not found, try without .html
        if (!fragment.ok) {
            fragment = await env.ASSETS.fetch(new Request(fragmentPathNoHtml));
        }
        
        if (!fragment.ok) {
            // Fragment doesn't exist - return 404 or fallback
            return new Response('Page not found', { status: 404 });
        }
        
        let fragmentHtml = await fragment.text();
        
        // Extract heading
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
        
        // Add active class to current tab
        tabsHtml = tabsHtml.replace(/href="([^"]+)"/g, (match, href) => {
            const isActive = (href === path) || 
                           (path === '/admin/' && href === '/admin/') ||
                           (path + '.html' === href) ||
                           (path === href + '/');
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
        return new Response('Error loading page', { status: 500 });
    }
}