// ========== SHARED LOADER ==========
// This file loads all shared components and provides common functions

// Load all shared components
async function loadSharedComponents() {
    // Load sidebar
    const sidebarResp = await fetch('/admin/shared/sidebar.html');
    const sidebarHtml = await sidebarResp.text();
    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    
    // Setup sidebar functionality
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebar');
    
    function closeSidebarFunction() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function openSidebarFunction() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    if (menuBtn) {
        menuBtn.onclick = openSidebarFunction;
    }
    
    if (closeBtn) {
        closeBtn.onclick = closeSidebarFunction;
    }
    
    if (overlay) {
        overlay.onclick = closeSidebarFunction;
    }
    
    // Close sidebar when clicking on a link (mobile)
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebarFunction();
            }
        });
    });
    
    // Load header
    const headerResp = await fetch('/admin/shared/header.html');
    let headerHtml = await headerResp.text();
    
    // Replace title and icon from data attributes
    const headerContainer = document.getElementById('admin-header');
    if (headerContainer) {
        const title = headerContainer.dataset.title || 'Admin';
        const icon = headerContainer.dataset.icon || 'cog';
        headerHtml = headerHtml.replace('[TITLE]', title);
        headerHtml = headerHtml.replace('[ICON]', icon);
        headerContainer.innerHTML = headerHtml;
    }
    
    // Load footer
    const footerResp = await fetch('/admin/shared/footer.html');
    const footerHtml = await footerResp.text();
    const footerContainer = document.getElementById('admin-footer');
    if (footerContainer) {
        footerContainer.innerHTML = footerHtml;
    }
    
    // Setup dropdown functionality for Analytics (closed by default)
    const dropdownToggle = document.querySelector('.nav-dropdown-toggle');
    const dropdown = document.querySelector('.nav-dropdown');
    
    // Ensure dropdown starts closed
    if (dropdown) {
        dropdown.classList.remove('open');
    }
    
    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const parentDropdown = dropdownToggle.closest('.nav-dropdown');
            parentDropdown.classList.toggle('open');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const openDropdown = document.querySelector('.nav-dropdown.open');
        if (openDropdown && !openDropdown.contains(e.target)) {
            openDropdown.classList.remove('open');
        }
    });
}

// ========== SHARED HELPER FUNCTIONS ==========
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds) {
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