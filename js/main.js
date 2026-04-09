// ===== Zedtopvibes.com - Main JavaScript with Live API Integration =====
// Uses relative paths - works on any domain (custom domain or pages.dev)

const API_BASE = '/api';
const IMAGE_BASE = '';  // Empty = use same domain as the page

// Prevent multiple initialization
let isInitialized = false;
let sectionsData = [];

// ===== HELPER FUNCTIONS =====

// Helper function to get primary artist from album
function getPrimaryArtistFromAlbum(album) {
    if (!album.artists || album.artists.length === 0) return null;
    const primary = album.artists.find(a => a.is_primary === 1);
    return primary || album.artists[0];
}

// Helper function to get artist display name from album
function getAlbumArtistDisplay(album) {
    const primary = getPrimaryArtistFromAlbum(album);
    if (primary) return primary.name;
    
    if (album.artist) return album.artist;
    if (album.artist_name) return album.artist_name;
    return 'Unknown Artist';
}

function getAlbumImage(album) {
    if (album.cover_url && album.cover_url !== 'null' && album.cover_url !== '') {
        return album.cover_url;
    }
    if (album.cover_emoji) {
        const encodedEmoji = encodeURIComponent(album.cover_emoji);
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ff5500'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E${encodedEmoji}%3C/text%3E%3C/svg%3E`;
    }
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23333'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E";
}

function getPlaylistImage(playlist) {
    if (playlist.cover_url && playlist.cover_url !== 'null' && playlist.cover_url !== '') {
        return playlist.cover_url;
    }
    if (playlist.cover_emoji) {
        const encodedEmoji = encodeURIComponent(playlist.cover_emoji);
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%239c27b0'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E${encodedEmoji}%3C/text%3E%3C/svg%3E`;
    }
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%239c27b0'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E📋%3C/text%3E%3C/svg%3E";
}

function getArtistImage(artist) {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232196f3'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎤%3C/text%3E%3C/svg%3E";
}

function formatNumber(num) {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function handleImageError(img) {
    if (img.dataset.fallbackUsed) return;
    img.dataset.fallbackUsed = 'true';
    const type = img.dataset.type || 'default';
    if (type === 'playlist') {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%239c27b0'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E📋%3C/text%3E%3C/svg%3E";
    } else if (type === 'artist') {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%232196f3'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎤%3C/text%3E%3C/svg%3E";
    } else {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ff5500'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E";
    }
}

// ===== HOMEPAGE SECTIONS - HYBRID APPROACH =====

async function loadHomepageSections() {
    const container = document.getElementById('homepage-sections-container');
    if (!container) return;
    
    // Step 1: Immediately create placeholder sections (appear instantly)
    createPlaceholderSections(container);
    
    // Step 2: Fetch real section data
    try {
        const response = await fetch(`${API_BASE}/homepage/sections/metadata`);
        const sections = await response.json();
        
        if (!sections || sections.length === 0) {
            return;
        }
        
        sectionsData = sections;
        
        // Step 3: Update headers with real data
        for (const section of sections) {
            updateSectionHeader(section);
        }
        
        // Step 4: Fetch content for all sections in parallel
        const contentPromises = sections.map(async (section) => {
            try {
                const contentResponse = await fetch(`${API_BASE}/homepage/section/${section.id}/items`);
                const items = await contentResponse.json();
                return { id: section.id, items: items };
            } catch (err) {
                console.error(`Error loading content for section ${section.id}:`, err);
                return { id: section.id, items: [] };
            }
        });
        
        const sectionsWithContent = await Promise.all(contentPromises);
        
        // Step 5: Update content grids
        for (const sectionContent of sectionsWithContent) {
            const section = sections.find(s => s.id === sectionContent.id);
            if (section && sectionContent.items && sectionContent.items.length > 0) {
                updateSectionContent(section, sectionContent.items);
            }
        }
        
    } catch (error) {
        console.error('Error loading homepage sections:', error);
    }
}

function createPlaceholderSections(container) {
    // Create 3 placeholder sections (will be replaced or updated)
    let html = '';
    for (let i = 1; i <= 3; i++) {
        html += `
            <div class="section-wrapper" data-section-id="placeholder-${i}">
                <div class="section-header">
                    <h2 class="section-title">Loading section...</h2>
                    <a href="#" class="see-all-btn">See All</a>
                </div>
                <div class="corner">
                    <div class="music-grid" id="section-grid-placeholder-${i}">
                        ${Array(6).fill(0).map(() => `
                            <div class="skeleton-card">
                                <div class="skeleton-thumb"></div>
                                <div class="skeleton-title"></div>
                                <div class="skeleton-text"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function updateSectionHeader(section) {
    // Find or create section wrapper
    let wrapper = document.querySelector(`.section-wrapper[data-section-id="${section.id}"]`);
    
    if (!wrapper) {
        // Create new wrapper if doesn't exist
        wrapper = document.createElement('div');
        wrapper.className = 'section-wrapper';
        wrapper.setAttribute('data-section-id', section.id);
        document.getElementById('homepage-sections-container').appendChild(wrapper);
    }
    
    // Update header
    wrapper.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">${escapeHtml(section.title)}</h2>
            <a href="/${section.source_type === 'playlist' ? 'playlist' : 'compilation'}/${section.source_slug}" class="see-all-btn">See All</a>
        </div>
        <div class="corner">
            <div class="music-grid" id="section-grid-${section.id}">
                ${Array(6).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton-thumb"></div>
                        <div class="skeleton-title"></div>
                        <div class="skeleton-text"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function updateSectionContent(section, items) {
    const gridContainer = document.getElementById(`section-grid-${section.id}`);
    if (!gridContainer) return;
    
    if (items.length === 0) {
        gridContainer.innerHTML = '<div class="error-message">No items available</div>';
        return;
    }
    
    const itemUrl = (item) => {
        if (section.source_type === 'playlist') return `/song/${item.slug}`;
        if (item.type === 'album') return `/album/${item.slug}`;
        if (item.type === 'ep') return `/ep/${item.slug}`;
        if (item.type === 'artist') return `/artist/${item.slug}`;
        if (item.type === 'playlist') return `/playlist/${item.slug}`;
        return '#';
    };
    
    const itemImage = (item) => {
        if (item.cover_url) return item.cover_url;
        if (section.source_type === 'playlist') {
            return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ff5500'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E";
        }
        return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ff4b2b'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E📀%3C/text%3E%3C/svg%3E";
    };
    
    const itemSubtitle = (item) => {
        if (section.source_type === 'playlist') return item.artist || 'Unknown Artist';
        if (item.type === 'album') return item.artist || 'Various Artists';
        if (item.type === 'ep') return item.artist || 'Various Artists';
        if (item.type === 'artist') return item.artist || 'Artist';
        if (item.type === 'playlist') return item.artist || 'Playlist';
        return '';
    };
    
    gridContainer.innerHTML = items.map(item => `
        <a href="${itemUrl(item)}" class="music-item">
            <div class="item-container">
                <div class="item-thumb">
                    <img src="${itemImage(item)}" width="80" height="80" class="roundthumb" alt="${escapeHtml(item.title)}" data-type="${section.source_type === 'playlist' ? 'default' : item.type}" onerror="handleImageError(this)">
                </div>
                <div class="item-data">
                    <span class="track-title"><b>${escapeHtml(item.title)}</b></span>
                    <div class="artist-name">${escapeHtml(itemSubtitle(item))}</div>
                    <span class="item-meta">
                        ${item.duration ? `<b style="color:#ff0000">${formatDuration(item.duration)}</b>` : ''}
                    </span>
                </div>
            </div>
        </a>
    `).join('');
}

// ===== FALLBACK DEFAULT SECTIONS =====
async function loadDefaultSections() {
    const container = document.getElementById('homepage-sections-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Trending Now</h2>
            <a href="#" class="see-all-btn" onclick="searchByGenre('trending'); return false;">See All</a>
        </div>
        <div class="corner">
            <div class="music-grid" id="trending-container"><div class="loading">Loading...</div></div>
        </div>
        
        <div class="section-header section-spacing">
            <h2 class="section-title">Latest Releases</h2>
            <a href="#" class="see-all-btn" onclick="loadMore(2); return false;">See All</a>
        </div>
        <div class="corner">
            <div class="music-grid" id="latest-container"><div class="loading">Loading...</div></div>
        </div>
        
        <div class="section-header section-spacing">
            <h2 class="section-title">Playlists</h2>
            <a href="/playlists.html" class="see-all-btn">See All</a>
        </div>
        <div class="corner">
            <div class="music-grid" id="playlists-container"><div class="loading">Loading...</div></div>
        </div>
    `;
    
    loadTrending();
    loadLatestReleases();
    loadPlaylists();
}

async function loadTrending() {
    const container = document.getElementById('trending-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading trending...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/albums`);
        const albums = await response.json();
        
        const trending = [...albums]
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 6);
        
        if (!trending || trending.length === 0) {
            container.innerHTML = '<div class="error-message">No trending content</div>';
            return;
        }
        
        container.innerHTML = trending.map(album => {
            const artistName = getAlbumArtistDisplay(album);
            return `
                <a href="/album/${album.slug}" class="music-item">
                    <div class="item-container">
                        <div class="item-thumb">
                            <img src="${getAlbumImage(album)}" width="80" height="80" class="roundthumb" alt="${escapeHtml(album.title)}" data-type="album" onerror="handleImageError(this)">
                        </div>
                        <div class="item-data">
                            <span class="track-title"><b>${escapeHtml(album.title)}</b></span>
                            <div class="artist-name">${escapeHtml(artistName)}</div>
                            <span class="item-meta"><b style="color:#ff0000">${album.plays ? formatNumber(album.plays) + ' plays' : 'Trending'}</b><span class="hot-badge" style="background:#ff9800; color:#fff; padding:2px 6px; margin-left:5px; border-radius:3px; font-size:11px;">🔥 Hot</span></span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading trending:', error);
        container.innerHTML = '<div class="error-message">Failed to load trending</div>';
    }
}

async function loadLatestReleases() {
    const container = document.getElementById('latest-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading latest releases...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/albums`);
        const albums = await response.json();
        
        const latest = [...albums]
            .filter(a => a.release_date)
            .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
            .slice(0, 6);
        
        if (!latest || latest.length === 0) {
            container.innerHTML = '<div class="error-message">No releases found</div>';
            return;
        }
        
        container.innerHTML = latest.map(album => {
            const artistName = getAlbumArtistDisplay(album);
            return `
                <a href="/album/${album.slug}" class="music-item">
                    <div class="item-container">
                        <div class="item-thumb">
                            <img src="${getAlbumImage(album)}" width="80" height="80" class="roundthumb" alt="${escapeHtml(album.title)}" data-type="album" onerror="handleImageError(this)">
                        </div>
                        <div class="item-data">
                            <span class="track-title"><b>${escapeHtml(album.title)}</b></span>
                            <div class="artist-name">${escapeHtml(artistName)}</div>
                            <span class="item-meta"><b style="color:#ff0000">Released:</b> ${album.release_date ? new Date(album.release_date).getFullYear() : 'TBA'}<span class="new-badge" style="background:#4caf50; color:#fff; padding:2px 6px; margin-left:5px; border-radius:3px; font-size:11px;">New</span></span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading latest releases:', error);
        container.innerHTML = '<div class="error-message">Failed to load latest releases</div>';
    }
}

async function loadPlaylists() {
    const container = document.getElementById('playlists-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading playlists...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/playlists`);
        const playlists = await response.json();
        
        if (!playlists || playlists.length === 0) {
            container.innerHTML = '<div class="error-message">No playlists found</div>';
            return;
        }
        
        container.innerHTML = playlists.slice(0, 6).map(playlist => `
            <a href="/playlist/${playlist.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getPlaylistImage(playlist)}" width="80" height="80" class="roundthumb" alt="${escapeHtml(playlist.name)}" data-type="playlist" onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(playlist.name)}</b> <span class="playlist-badge">Playlist</span></span>
                        <div class="artist-name">${escapeHtml(playlist.created_by || 'Various Artists')}</div>
                        <span class="item-meta"><b style="color:#ff0000">${playlist.track_count || 0} songs</b></span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading playlists:', error);
        container.innerHTML = '<div class="error-message">Playlists unavailable</div>';
    }
}

// ===== HEADER & FOOTER LOADER =====
async function loadHeaderAndFooter() {
    try {
        const [headerData, footerData] = await Promise.all([
            fetch('/header.html').then(r => r.text()),
            fetch('/footer.html').then(r => r.text())
        ]);
        
        const headerPlaceholder = document.getElementById('header-placeholder');
        const footerPlaceholder = document.getElementById('footer-placeholder');
        
        if (headerPlaceholder) headerPlaceholder.innerHTML = headerData;
        if (footerPlaceholder) footerPlaceholder.innerHTML = footerData;
        
        setTimeout(initializeSidebar, 100);
    } catch (error) {
        console.log('Header/footer files not found:', error);
    }
}

// ===== SIDEBAR FUNCTIONS =====
function initializeSidebar() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebarBtn');

    if (hamburger && sidebar && overlay && closeBtn) {
        hamburger.addEventListener('click', openSidebar);
        closeBtn.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== SCROLL BUTTON =====
function initializeScrollButton() {
    const scrollButton = document.getElementById('scrollBtn');
    if (!scrollButton) return;
    
    const progressCircle = scrollButton.querySelector('.progress');
    if (progressCircle) {
        const circumference = 2 * Math.PI * progressCircle.r.baseVal.value;
        progressCircle.style.strokeDasharray = circumference;
    }

    const handleScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercentage = (scrollHeight > 0) ? (scrollTop / scrollHeight) * 100 : 0;
        scrollButton.style.setProperty('--progress', scrollPercentage);
        
        if (scrollTop < 50) {
            scrollButton.classList.add('scroll-at-top');
        } else {
            scrollButton.classList.remove('scroll-at-top');
        }
    };

    const handleClick = () => {
        const isAtTop = scrollButton.classList.contains('scroll-at-top');
        window.scrollTo({
            top: isAtTop ? document.body.scrollHeight : 0,
            behavior: 'smooth'
        });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollButton.addEventListener('click', handleClick);
    handleScroll();
}

// ===== LIVE SEARCH =====
function initializeLiveSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const resultsDiv = document.getElementById('liveSearchResults');
    if (!resultsDiv) return;
    
    let debounceTimer;
    
    searchInput.addEventListener('input', async function(e) {
        clearTimeout(debounceTimer);
        const term = e.target.value.trim();
        
        if (term.length < 2) {
            resultsDiv.innerHTML = '';
            return;
        }
        
        debounceTimer = setTimeout(async () => {
            resultsDiv.innerHTML = '<div class="loading-small">Searching...</div>';
            
            try {
                const albumsRes = await fetch(`${API_BASE}/albums`);
                const albums = await albumsRes.json();
                
                const results = albums.filter(album => {
                    const artistName = getAlbumArtistDisplay(album);
                    return album.title.toLowerCase().includes(term.toLowerCase()) ||
                           artistName.toLowerCase().includes(term.toLowerCase());
                }).slice(0, 5);
                
                if (results.length > 0) {
                    resultsDiv.innerHTML = `
                        <ul class="live-search-list">
                            ${results.map(item => {
                                const artistName = getAlbumArtistDisplay(item);
                                return `
                                    <li>
                                        <a href="/album/${item.slug}">
                                            ${escapeHtml(item.title)} - ${escapeHtml(artistName)}
                                        </a>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="no-results">No results found</div>';
                }
            } catch (error) {
                console.error('Search error:', error);
                resultsDiv.innerHTML = '<div class="error-message">Search failed</div>';
            }
        }, 300);
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.innerHTML = '';
        }
    });
}

// ===== GLOBAL FUNCTIONS =====
function searchByGenre(genre) {
    window.location.href = `/genre/${genre}`;
    closeSidebar();
    return false;
}

function loadMore(page) {
    window.location.href = `/albums?page=${page}`;
    return false;
}

function searchMusic() {
    const searchTerm = document.getElementById('searchInput')?.value;
    if (searchTerm) {
        window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
    }
    return false;
}

window.handleImageError = handleImageError;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    if (isInitialized) return;
    isInitialized = true;
    
    console.log('DOM ready - initializing...');
    
    loadHeaderAndFooter();
    initializeScrollButton();
    initializeLiveSearch();
    
    // Load homepage sections (hybrid approach)
    await loadHomepageSections();
});

window.searchMusic = searchMusic;
window.searchByGenre = searchByGenre;
window.loadMore = loadMore;
window.closeSidebar = closeSidebar;