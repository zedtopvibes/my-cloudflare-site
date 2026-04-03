export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Only process HTML files in /admin/
    if (!path.startsWith('/admin/') || !path.endsWith('.html')) {
        return next();
    }
    
    // Build path to fragment
    let fragmentPath = path.replace('/admin/', '/admin/_fragments/');
    
    try {
        // Try to read the fragment
        const fragment = await env.ASSETS.fetch(new Request(fragmentPath));
        
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
            // Remove the heading comment from output
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
                           (path.endsWith('/index.html') && href === path.replace('/index.html', '/')) ||
                           (href.endsWith('/index.html') && path === href.replace('/index.html', '/'));
            
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