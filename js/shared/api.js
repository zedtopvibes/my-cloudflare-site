// ===== API FUNCTIONS =====
import { API_BASE } from './helpers.js';

// ===== TRACKS =====
export async function fetchTracks() {
    const response = await fetch(`${API_BASE}/tracks`);
    if (!response.ok) throw new Error('Failed to fetch tracks');
    return await response.json();
}

export async function fetchTrack(id) {
    const response = await fetch(`${API_BASE}/tracks/${id}`);
    if (!response.ok) throw new Error('Track not found');
    return await response.json();
}

// ===== ARTISTS =====
export async function fetchArtist(slug) {
    const response = await fetch(`${API_BASE}/artist/${slug}`);
    if (!response.ok) throw new Error('Artist not found');
    return await response.json();
}

// ===== ALBUMS =====
export async function fetchAlbums() {
    const response = await fetch(`${API_BASE}/albums`);
    if (!response.ok) throw new Error('Failed to fetch albums');
    return await response.json();
}

export async function fetchAlbum(slug) {
    const response = await fetch(`${API_BASE}/album/by-slug/${slug}`);
    if (!response.ok) throw new Error('Album not found');
    return await response.json();
}

// ===== PLAYLISTS =====
export async function fetchPlaylists() {
    const response = await fetch(`${API_BASE}/playlists`);
    if (!response.ok) throw new Error('Failed to fetch playlists');
    return await response.json();
}

export async function fetchPlaylist(slug) {
    const response = await fetch(`${API_BASE}/playlist/by-slug/${slug}`);
    if (!response.ok) throw new Error('Playlist not found');
    return await response.json();
}

// ===== SONGS =====
export async function fetchSong(slug) {
    const response = await fetch(`${API_BASE}/song/by-slug/${slug}`);
    if (!response.ok) throw new Error('Song not found');
    return await response.json();
}

// ===== TRENDING =====
export async function fetchTrending() {
    const response = await fetch(`${API_BASE}/trending`);
    if (!response.ok) throw new Error('Failed to fetch trending');
    return await response.json();
}

// ===== STATS INCREMENTS =====
export async function incrementPlays(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function incrementDownloads(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function incrementViews(type, id) {
    return fetch(`${API_BASE}/${type}s/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
}