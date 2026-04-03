export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Only process /admin/ paths
    if (!path.startsWith('/admin/')) {
        return next();
    }
    
    // Build fragment path: /admin/upload.html → /fragments/upload.html
    let fragmentPath = path.replace('/admin/', '/fragments/');
    
    try {
        const fragment = await env.ASSETS.fetch(new Request(fragmentPath));
        
        if (!fragment.ok) {
            return next();
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
        
        // Add active class
        tabsHtml = tabsHtml.replace(/href="([^"]+)"/g, (match, href) => {
            const isActive = (href === path) || 
                           (path === '/admin/' && href === '/admin/');
            if (isActive) {
                return match + ' class="tab-btn active"';
            }
            return match;
        });
        
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