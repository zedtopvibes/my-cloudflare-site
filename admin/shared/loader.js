// ========== SHARED LOADER ==========
async function loadSharedComponents() {
    // 1. Fetch and inject all HTML files (Sequential Execution)
    try {
        const sidebarResp = await fetch('/admin/shared/sidebar.html');
        const sidebarHtml = await sidebarResp.text();
        document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
        
        const headerResp = await fetch('/admin/shared/header.html');
        let headerHtml = await headerResp.text();
        const headerContainer = document.getElementById('admin-header');
        if (headerContainer) {
            const title = headerContainer.dataset.title || 'Admin';
            const icon = headerContainer.dataset.icon || 'cog';
            headerHtml = headerHtml.replace('[TITLE]', title).replace('[ICON]', icon);
            headerContainer.innerHTML = headerHtml;
        }
        
        const footerResp = await fetch('/admin/shared/footer.html');
        const footerHtml = await footerResp.text();
        document.getElementById('admin-footer').innerHTML = footerHtml;
    } catch (err) {
        console.error("Error loading shared fragments:", err);
    }

    // 2. Sidebar Mobile View Mechanics
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebar');
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    if (menuBtn) menuBtn.onclick = openSidebar;
    if (closeBtn) closeBtn.onclick = closeSidebar;
    if (overlay) overlay.onclick = closeSidebar;
}

// ========== FIXED: Global Event Delegation for Nav Dropdowns ==========
// This handles any nav-dropdown clicks safely, no matter how fast or slow the HTML renders.
document.addEventListener('click', (e) => {
    // Check if the click target is a toggle button (or an icon inside it)
    const toggle = e.target.closest('.nav-dropdown-toggle');
    
    if (toggle) {
        e.stopPropagation();
        const parent = toggle.closest('.nav-dropdown');
        
        if (parent) {
            // Optional: Close all other open dropdowns first (Accordion Behavior)
            document.querySelectorAll('.nav-dropdown.open').forEach(openDropdown => {
                if (openDropdown !== parent) {
                    openDropdown.classList.remove('open');
                }
            });
            // Toggle current dropdown
            parent.classList.toggle('open');
        }
    } else {
        // If the user clicks anywhere else outside, close all active dropdowns
        document.querySelectorAll('.nav-dropdown.open').forEach(openDropdown => {
            if (!openDropdown.contains(e.target)) {
                openDropdown.classList.remove('open');
            }
        });
    }
});

// Helper functions (keep as they are)
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

// Initialization Check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSharedComponents);
} else {
    loadSharedComponents();
}
