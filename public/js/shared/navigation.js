// ===== NAVIGATION FUNCTIONS =====
// Single source of truth for all navigation

// Go to home page
export function goHome() {
    window.location.href = '/';
}

// Go to artist page with slug
export function goToArtist(artistName) {
    if (!artistName) return;
    
    const slug = artistName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
    
    window.location.href = `/artist/${slug}`;
}

// Go to song page
export function goToSong(id, slug) {
    // Increment view count
    fetch(`${API_BASE}/tracks/${id}/view`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('View count error:', err));
    
    if (slug) {
        window.location.href = `/song/${slug}`;
    } else {
        window.location.href = `/song.html?id=${id}`;
    }
}

// Go to album page
export function goToAlbum(slug, id) {
    if (slug) {
        window.location.href = `/album/${slug}`;
    } else {
        window.location.href = `/album.html?id=${id}`;
    }
}

// Go to playlist page
export function goToPlaylist(slug, id) {
    if (slug) {
        window.location.href = `/playlist/${slug}`;
    } else {
        window.location.href = `/playlist.html?id=${id}`;
    }
}

// Go to search
export function goToSearch(query) {
    if (!query.trim()) return;
    window.location.href = `/?search=${encodeURIComponent(query)}`;
}