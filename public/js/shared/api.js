// ===== API FUNCTIONS =====
import { API_BASE } from './helpers.js';

// Fetch all tracks
export async function fetchTracks() {
    const response = await fetch(`${API_BASE}/tracks`);
    return await response.json();
}

// Fetch artist by slug
export async function fetchArtist(slug) {
    const response = await fetch(`${API_BASE}/artist/${slug}`);
    if (!response.ok) throw new Error('Artist not found');
    return await response.json();
}

// Fetch album by slug
export async function fetchAlbum(slug) {
    const response = await fetch(`${API_BASE}/album/by-slug/${slug}`);
    if (!response.ok) throw new Error('Album not found');
    return await response.json();
}

// Fetch playlist by slug
export async function fetchPlaylist(slug) {
    const response = await fetch(`${API_BASE}/playlist/by-slug/${slug}`);
    if (!response.ok) throw new Error('Playlist not found');
    return await response.json();
}

// Fetch song by slug
export async function fetchSong(slug) {
    const response = await fetch(`${API_BASE}/song/by-slug/${slug}`);
    if (!response.ok) throw new Error('Song not found');
    return await response.json();
}

// Fetch trending
export async function fetchTrending() {
    const response = await fetch(`${API_BASE}/trending`);
    return await response.json();
}

// Increment play count
export async function incrementPlays(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

// Increment download count
export async function incrementDownloads(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

// Increment view count
export async function incrementViews(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}