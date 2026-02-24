// Check authentication
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    document.getElementById('auth-check').style.display = 'block';
    document.getElementById('blog-admin').style.display = 'none';
} else {
    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('blog-admin').style.display = 'block';
    loadPosts();
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the correct tab
    document.querySelectorAll('.tab').forEach(tab => {
        if (tab.getAttribute('onclick')?.includes(tabName)) {
            tab.classList.add('active');
        }
    });
    
    // Show selected tab
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
    const title = document.getElementById('post-title').value;
    const description = document.getElementById('post-description').value;
    const content = document.getElementById('post-content').value;
    const image_path = document.getElementById('post-image').value;
    const audio_path = document.getElementById('post-audio').value;
    
    if (!title || !description || !content) {
        alert('Please fill in title, description, and content');
        return;
    }
    
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
                image_path,
                audio_path
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Post created successfully!');
            // Clear form
            document.getElementById('post-title').value = '';
            document.getElementById('post-description').value = '';
            document.getElementById('post-content').value = '';
            document.getElementById('post-image').value = '';
            document.getElementById('post-audio').value = '';
            
            // Switch to list tab
            showTab('list');
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.success && data.posts.length > 0) {
            postsList.innerHTML = data.posts.map(post => `
                <div class="post-item">
                    <div>
                        <div class="post-title">${post.title}</div>
                        <div class="post-date">${post.date} · ${post.views} views</div>
                    </div>
                    <div>
                        <a href="/post/${post.slug}" target="_blank" class="btn-small" style="background:#667eea; color:white; text-decoration:none; padding:0.25rem 0.75rem; border-radius:3px;">View</a>
                    </div>
                </div>
            `).join('');
        } else {
            postsList.innerHTML = '<p>No posts yet. Create your first post!</p>';
        }
    } catch (error) {
        postsList.innerHTML = '<p>Error loading posts.</p>';
        console.error('Error:', error);
    }
}