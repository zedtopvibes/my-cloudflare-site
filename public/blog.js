// Load blog posts
async function loadPosts() {
    const container = document.getElementById('blog-posts');
    
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.success && data.posts.length > 0) {
            container.innerHTML = data.posts.map(post => `
                <div class="blog-card">
                    <div class="blog-card-image" style="background-image: url('${post.image_path || 'https://via.placeholder.com/300x200'}')"></div>
                    <div class="blog-card-content">
                        <h3>${post.title}</h3>
                        <div class="date">${post.date}</div>
                        <p>${post.description.substring(0, 120)}${post.description.length > 120 ? '...' : ''}</p>
                        <a href="/post/${post.slug}" class="read-more">Read More →</a>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No posts yet. Check back soon!</p>';
        }
    } catch (error) {
        container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#dc3545;">Error loading posts.</p>';
        console.error('Error:', error);
    }
}

// Load posts when page loads
document.addEventListener('DOMContentLoaded', loadPosts);