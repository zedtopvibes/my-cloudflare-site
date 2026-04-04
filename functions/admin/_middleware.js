export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Only process /admin/ paths
    if (!path.startsWith('/admin/')) {
        return next();
    }
    
    // Skip layout and fragment direct access
    if (path.includes('/_layout/')) {
        return next();
    }
    
    // Convert /admin/upload.html → /fragments/upload.html
    let fragmentPath = path.replace('/admin/', '/fragments/');
    
    console.log('Looking for fragment:', fragmentPath);
    
    try {
        // Fetch the fragment
        const fragment = await env.ASSETS.fetch(new Request(fragmentPath));
        
        if (!fragment.ok) {
            console.log('Fragment not found:', fragmentPath, fragment.status);
            return new Response('Page not found', { status: 404 });
        }
        
        let fragmentHtml = await fragment.text();
        console.log('Fragment loaded, length:', fragmentHtml.length);
        
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
        
        if (!headerTemplate.ok || !tabsTemplate.ok || !footerTemplate.ok) {
            console.log('Layout files missing');
            return new Response('Layout files missing', { status: 500 });
        }
        
        let headerHtml = await headerTemplate.text();
        let tabsHtml = await tabsTemplate.text();
        let footerHtml = await footerTemplate.text();
        
        // Add active class to current tab
        tabsHtml = tabsHtml.replace(/href="([^"]+)"/g, (match, href) => {
            const isActive = (href === path) || 
                           (path === '/admin/' && href === '/admin/') ||
                           (href === path + '.html');
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
        return new Response('Error loading page: ' + error.message, { status: 500 });
    }
}