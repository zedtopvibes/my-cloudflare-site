// Simple client-side authentication
// In Stage 3 we'll move this to a Worker
const ADMIN_PASSWORD = "admin123"; // CHANGE THIS!

function login() {
    const password = document.getElementById('password').value;
    
    if (password === ADMIN_PASSWORD) {
        // Show admin panel
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        
        // Store login state
        localStorage.setItem('adminLoggedIn', 'true');
        
        console.log('Admin logged in successfully');
    } else {
        alert('Invalid password!');
    }
}

function logout() {
    // Hide admin panel
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    
    // Clear login state
    localStorage.removeItem('adminLoggedIn');
    
    console.log('Admin logged out');
}

// Check if already logged in
window.onload = function() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
    }
}