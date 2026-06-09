// ========== SHARED LOADER ==========
async function loadSharedComponents() {
    // Load sidebar
    const sidebarResp = await fetch('/admin/shared/sidebar.html');
    const sidebarHtml = await sidebarResp.text();
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    
    // Sidebar open/close functionality
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebar');
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    if (menuBtn) menuBtn.onclick = openSidebar;
    if (closeBtn) closeBtn.onclick = closeSidebar;
    if (overlay) overlay.onclick = closeSidebar;
    
    // Close sidebar on mobile when clicking a link
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });
    
    // =========================================================
    // ACCORDION DROPDOWN FUNCTIONALITY (BUBBLE-SAFE FIX)
    // =========================================================
    if (sidebar) {
        const dropdowns = sidebar.querySelectorAll('.nav-dropdown');
        
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.nav-dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    // Check if this specific item is already open
                    const isOpen = dropdown.classList.contains('open');
                    
                    // 1. Close ALL dropdowns first
                    dropdowns.forEach(d => d.classList.remove('open'));
                    
                    // 2. Toggle state cleanly based on previous check
                    if (!isOpen) {
                        dropdown.classList.add('open');
                    }
                });
            }
        });
    }
    // =========================================================
    
    // Load header
    const headerResp = await fetch('/admin/shared/header.html');
    let headerHtml = await headerResp.text();
    const headerContainer = document.getElementById('admin-header');
    if (headerContainer) {
        const title = headerContainer.dataset.title || 'Admin';
        const icon = headerContainer.dataset.icon || 'cog';
        headerHtml = headerHtml.replace('[TITLE]', title).replace('[ICON]', icon);
        headerContainer.innerHTML = headerHtml;
    }
    
    // Load footer
    const footerResp = await fetch('/admin/shared/footer.html');
    const footerHtml = await footerResp.text();
    const footerContainer = document.getElementById('admin-footer');
    if (footerContainer) {
        footerContainer.innerHTML = footerHtml;
    }
}

// ========== SHARED HELPER FUNCTIONS ==========
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(type, message) {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;
    
    const icon = statusEl.querySelector('i');
    const span = statusEl.querySelector('span');
    
    statusEl.className = 'status-message';
    statusEl.classList.add(`status-${type}`);
    
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    if (icon) icon.className = `fas ${icons[type]}`;
    if (span) span.textContent = message;
    statusEl.style.display = 'flex';
    
    setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSharedComponents);
} else {
    loadSharedComponents();
}
