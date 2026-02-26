// ===== HELPER FUNCTIONS =====
// These will be used across ALL pages

export const API_BASE = '/api';

// Format numbers (1000 → 1K, 1000000 → 1M)
export function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
}

// Format duration (seconds → MM:SS)
export function formatDuration(seconds) {
    if (!seconds) return '?:??';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date (ISO string → relative time)
export function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) return 'Today';
    if (diff < 48 * 60 * 60 * 1000) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get emoji for genre
export function getEmojiForGenre(genre) {
    const emojis = {
        'electronic': '🎵',
        'synthwave': '🎸',
        'hiphop': '🎤',
        'lofi': '🌅',
        'ambient': '✨',
        'zam-hip-hop': '🇿🇲',
        'zam-pop': '🇿🇲',
        'default': '🎵'
    };
    return emojis[genre?.toLowerCase()] || emojis.default;
}

// Generate slug from text
export function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Get random gradient for avatars
export function getRandomColor() {
    const colors = [
        'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
        'linear-gradient(135deg, #4ecdc4, #45b7d1)',
        'linear-gradient(135deg, #96ceb4, #ffeead)',
        'linear-gradient(135deg, #ffcc5c, #ff6f69)',
        'linear-gradient(135deg, #a8b8ff, #ff7eb3)',
        'linear-gradient(135deg, #ffd6b3, #ffb38c)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}