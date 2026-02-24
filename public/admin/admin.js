async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show admin panel
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            
            // Show username in admin panel
            document.getElementById('logged-in-user').textContent = username;
            
            // Store login state
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('adminUsername', username);
            
            console.log('Admin logged in successfully');
        } else {
            alert('Login failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

function logout() {
    // Hide admin panel
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    
    // Clear login state
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    
    // Clear input fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    console.log('Admin logged out');
}

// Check if already logged in
window.onload = function() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        
        // Restore username
        const username = localStorage.getItem('adminUsername') || 'admin';
        document.getElementById('logged-in-user').textContent = username;
    }
}