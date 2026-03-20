// ===== Zedtopvibes.com - Main JavaScript with Live API Integration =====
// Connected to: https://zedtopvibes.pages.dev/api

const API_BASE = 'https://zedtopvibes.pages.dev/api';
const IMAGE_BASE = 'https://zedtopvibes.pages.dev';

// Prevent multiple initialization
let isInitialized = false;
let contentLoaded = false;

// ===== HELPER FUNCTIONS =====

// Stable image fallback - prevents layout shifts and glitching
function getAlbumImage(album) {
    if (album.cover_url && album.cover_url !== 'null' && album.cover_url !== '') {
        // Convert relative path to absolute URL from main site
        if (album.cover_url.startsWith('/')) {
            return `${IMAGE_BASE}${album.cover_url}`;
        }
        return album.cover_url;
    }
    // SVG placeholder with emoji
    if (album.cover_emoji) {
        const encodedEmoji = encodeURIComponent(album.cover_emoji);
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ff5500'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E${encodedEmoji}%3C/text%3E%3C/svg%3E`;
    }
    // Default music note placeholder
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23333'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='white' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E";
}

function getPlaylistImage(playlist) {
    if (playlist.cover_url && playlist.cover_url !== 'null' && playlist.cover_url !== '') {
        // Convert relative path to absolute URL from main site
        if (playlist.cover_url.startsWith('/')) {
            return `${IMAGE_BASE}${playlist.cover_url}`;
        }
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Handle image loading errors
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

// ===== RENDER FUNCTIONS =====

async function loadAlbums() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading albums...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/albums`);
        const albums = await response.json();
        
        if (!albums || albums.length === 0) {
            container.innerHTML = '<div class="error-message">No albums found</div>';
            return;
        }
        
        container.innerHTML = albums.slice(0, 6).map(album => `
            <a href="/album/${album.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getAlbumImage(album)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(album.title)}"
                             data-type="album"
                             onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(album.title)}</b></span>
                        <div class="artist-name">${escapeHtml(album.artist || 'Unknown Artist')}</div>
                        <span class="item-meta">
                            <b style="color:#ff0000">${album.track_count || 0} tracks</b>
                            ${album.release_date ? `<span style="margin-left:8px">${new Date(album.release_date).getFullYear()}</span>` : ''}
                        </span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading albums:', error);
        container.innerHTML = '<div class="error-message">Failed to load albums</div>';
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
        
        container.innerHTML = latest.map(album => `
            <a href="/album/${album.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getAlbumImage(album)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(album.title)}"
                             data-type="album"
                             onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(album.title)}</b></span>
                        <div class="artist-name">${escapeHtml(album.artist || 'Unknown Artist')}</div>
                        <span class="item-meta">
                            <b style="color:#ff0000">Released:</b> ${album.release_date ? new Date(album.release_date).getFullYear() : 'TBA'}
                            <span class="new-badge" style="background:#4caf50; color:#fff; padding:2px 6px; margin-left:5px; border-radius:3px; font-size:11px;">New</span>
                        </span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading latest releases:', error);
        container.innerHTML = '<div class="error-message">Failed to load latest releases</div>';
    }
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
        
        container.innerHTML = trending.map(album => `
            <a href="/album/${album.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getAlbumImage(album)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(album.title)}"
                             data-type="album"
                             onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(album.title)}</b></span>
                        <div class="artist-name">${escapeHtml(album.artist || 'Unknown Artist')}</div>
                        <span class="item-meta">
                            <b style="color:#ff0000">${album.plays ? formatNumber(album.plays) + ' plays' : 'Trending'}</b>
                            <span class="hot-badge" style="background:#ff9800; color:#fff; padding:2px 6px; margin-left:5px; border-radius:3px; font-size:11px;">🔥 Hot</span>
                        </span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading trending:', error);
        container.innerHTML = '<div class="error-message">Failed to load trending</div>';
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
                        <img src="${getPlaylistImage(playlist)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(playlist.name)}"
                             data-type="playlist"
                             onerror="handleImageError(this)">
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

async function loadEPs() {
    const container = document.getElementById('eps-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading EPs...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/albums`);
        const albums = await response.json();
        
        const eps = albums.filter(album => album.track_count <= 6 && album.track_count > 0).slice(0, 6);
        
        if (!eps || eps.length === 0) {
            container.innerHTML = '<div class="error-message">No EPs found</div>';
            return;
        }
        
        container.innerHTML = eps.map(ep => `
            <a href="/album/${ep.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getAlbumImage(ep)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(ep.title)}"
                             data-type="album"
                             onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(ep.title)}</b> <span class="ep-badge">EP</span></span>
                        <div class="artist-name">${escapeHtml(ep.artist || 'Unknown Artist')}</div>
                        <span class="item-meta"><b style="color:#ff0000">${ep.track_count || 0} tracks</b></span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading EPs:', error);
        container.innerHTML = '<div class="error-message">EPs unavailable</div>';
    }
}

async function loadArtists() {
    const container = document.getElementById('artists-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading artists...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/artists`);
        const artists = await response.json();
        
        if (!artists || artists.length === 0) {
            container.innerHTML = '<div class="error-message">No artists found</div>';
            return;
        }
        
        container.innerHTML = artists.slice(0, 6).map(artist => `
            <a href="/artist/${artist.slug}" class="music-item">
                <div class="item-container">
                    <div class="item-thumb">
                        <img src="${getArtistImage(artist)}" 
                             width="80" height="80" 
                             class="roundthumb" 
                             alt="${escapeHtml(artist.name)}"
                             data-type="artist"
                             onerror="handleImageError(this)">
                    </div>
                    <div class="item-data">
                        <span class="track-title"><b>${escapeHtml(artist.name)}</b> <span class="artist-badge">Artist</span></span>
                        <div class="artist-name">${artist.track_count || 0} tracks</div>
                        <span class="item-meta"><b style="color:#ff0000">${artist.genres?.[0] || 'Artist'}</b></span>
                    </div>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading artists:', error);
        container.innerHTML = '<div class="error-message">Artists unavailable</div>';
    }
}

async function loadGenres() {
    const container = document.getElementById('genres-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading genres...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/albums`);
        const albums = await response.json();
        
        const genreMap = new Map();
        albums.forEach(album => {
            if (album.genre && album.genre !== 'null') {
                const count = genreMap.get(album.genre) || 0;
                genreMap.set(album.genre, count + 1);
            }
        });
        
        const genres = Array.from(genreMap.entries()).map(([name, count]) => ({ name, count }));
        
        if (!genres || genres.length === 0) {
            container.innerHTML = '<div class="error-message">No genres found</div>';
            return;
        }
        
        container.innerHTML = genres.map(genre => `
            <a class="music-item" href="#" onclick="searchByGenre('${genre.name.toLowerCase()}'); return false;">
                <div class="item-container" style="display:flex;align-items:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="#007bff" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm1.5-7.5a.5.5 0 0 1-.5.5H6.707l1.147 1.146a.5.5 0 0 1-.708.708l-2-2a.5.5 0 0 1 0-.708l2-2a.5.5 0 1 1 .708.708L6.707 7.5H9a.5.5 0 0 1 .5.5z"></path>
                    </svg>
                    <strong style="font-size:15px;color:#000;margin-left:6px;">${escapeHtml(genre.name)}</strong>
                    <span style="margin-left:4px; color:#ff4b2b; font-weight:600;">(${genre.count})</span>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Error loading genres:', error);
        container.innerHTML = '<div class="error-message">Genres unavailable</div>';
    }
}

async function loadAllContent() {
    if (contentLoaded) {
        console.log('Content already loaded, skipping...');
        return;
    }
    
    contentLoaded = true;
    console.log('Loading content...');
    
    await Promise.all([
        loadTrending(),
        loadLatestReleases(),
        loadPlaylists(),
        loadAlbums(),
        loadEPs(),
        loadArtists(),
        loadGenres()
    ]);
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
                
                const results = albums.filter(album => 
                    album.title.toLowerCase().includes(term.toLowerCase()) ||
                    (album.artist && album.artist.toLowerCase().includes(term.toLowerCase()))
                ).slice(0, 5);
                
                if (results.length > 0) {
                    resultsDiv.innerHTML = `
                        <ul class="live-search-list">
                            ${results.map(item => `
                                <li>
                                    <a href="/album/${item.slug}">
                                        ${escapeHtml(item.title)} - ${escapeHtml(item.artist || '')}
                                    </a>
                                </li>
                            `).join('')}
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

// Make handleImageError globally available for inline onerror
window.handleImageError = handleImageError;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async function() {
    if (isInitialized) {
        console.log('Already initialized, skipping...');
        return;
    }
    isInitialized = true;
    
    console.log('DOM ready - initializing...');
    await loadHeaderAndFooter();
    initializeScrollButton();
    initializeLiveSearch();
    await loadAllContent();
});

// Make functions globally available
window.searchMusic = searchMusic;
window.searchByGenre = searchByGenre;
window.loadMore = loadMore;
window.closeSidebar = closeSidebar;