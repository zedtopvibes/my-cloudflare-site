// Check authentication
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    document.getElementById('auth-check').style.display = 'block';
    document.getElementById('blog-admin').style.display = 'none';
} else {
    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('blog-admin').style.display = 'block';
    loadPosts();
}

// Message display functions
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the correct tab by its onclick attribute
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.getAttribute('onclick')?.includes(tabName)) {
            tab.classList.add('active');
        }
    });
    
    // Show selected tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Load posts if switching to list tab
    if (tabName === 'list') {
        loadPosts();
    }
}

async function createPost() {
    const title = document.getElementById('post-title').value.trim();
    const description = document.getElementById('post-description').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const image_path = document.getElementById('post-image').value.trim();
    const audio_path = document.getElementById('post-audio').value.trim();
    
    // Validate required fields
    if (!title) {
        showError('Please enter a title');
        return;
    }
    if (!description) {
        showError('Please enter a description');
        return;
    }
    if (!content) {
        showError('Please enter content');
        return;
    }
    
    // Disable button during submission
    const submitBtn = event.target;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                content,
                image_path: image_path || null,
                audio_path: audio_path || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Post created successfully!');
            
            // Clear form
            document.getElementById('post-title').value = '';
            document.getElementById('post-description').value = '';
            document.getElementById('post-content').value = '';
            document.getElementById('post-image').value = '';
            document.getElementById('post-audio').value = '';
            
            // Switch to list tab
            showTab('list');
        } else {
            showError('Error: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        // Re-enable button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.success) {
            if (data.posts && data.posts.length > 0) {
                // Sort posts by date (newest first)
                const sortedPosts = data.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                postsList.innerHTML = sortedPosts.map(post => `
                    <div class="post-item">
                        <div style="flex: 1;">
                            <div class="post-title">${escapeHtml(post.title)}</div>
                            <div class="post-date">${formatDate(post.date)}</div>
                            <div class="post-stats">
                                <span>👁️ ${post.views || 0} views</span>
                                <span>📝 ${post.description ? post.description.substring(0, 50) + '...' : 'No description'}</span>
                            </div>
                        </div>
                        <div class="post-actions">
                            <a href="/post/${post.slug}" target="_blank" class="btn-small">View</a>
                            <button onclick="deletePost(${post.id})" class="btn-small delete">Delete</button>
                        </div>
                    </div>
                `).join('');
            } else {
                postsList.innerHTML = `
                    <div class="empty-state">
                        <p>📭 No posts yet</p>
                        <p>Click the "New Post" tab to create your first blog post!</p>
                    </div>
                `;
            }
        } else {
            showError('Failed to load posts');
            postsList.innerHTML = '<div class="empty-state"><p>Error loading posts. Please try again.</p></div>';
        }
    } catch (error) {
        showError('Error loading posts: ' + error.message);
        postsList.innerHTML = '<div class="empty-state"><p>Error loading posts. Please refresh the page.</p></div>';
    }
}

async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Post deleted successfully');
            loadPosts(); // Reload the list
        } else {
            showError('Error: ' + (data.message || 'Failed to delete post'));
        }
    } catch (error) {
        showError('Error: ' + error.message);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Load posts when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        loadPosts();
    }
});