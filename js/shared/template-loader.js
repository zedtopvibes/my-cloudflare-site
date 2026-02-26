// ===== TEMPLATE LOADER =====
// Helper to load HTML templates

const TEMPLATE_CACHE = new Map();

export async function loadTemplate(name) {
    if (TEMPLATE_CACHE.has(name)) {
        return TEMPLATE_CACHE.get(name);
    }
    
    try {
        const response = await fetch(`/templates/${name}.html`);
        if (!response.ok) throw new Error(`Template ${name} not found`);
        const html = await response.text();
        TEMPLATE_CACHE.set(name, html);
        return html;
    } catch (error) {
        console.error(`Error loading template ${name}:`, error);
        return '';
    }
}

export async function injectTemplates(containerId = 'content') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Load all templates in parallel
    const [head, header, footer, player] = await Promise.all([
        loadTemplate('head'),
        loadTemplate('header'),
        loadTemplate('footer'),
        loadTemplate('player-bar')
    ]);
    
    // Inject head if not already present
    if (!document.querySelector('meta[charset]')) {
        document.head.insertAdjacentHTML('afterbegin', head);
    }
    
    // Inject header at beginning of body
    document.body.insertAdjacentHTML('afterbegin', header);
    
    // Inject player bar before footer
    if (player) {
        document.body.insertAdjacentHTML('beforeend', player);
    }
    
    // Footer will be injected by the page
    return { head, header, footer, player };
}