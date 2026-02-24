// Get elements
const loginButton = document.getElementById('login-button');
const spinner = document.getElementById('spinner');
const loginLoading = document.getElementById('login-loading');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

function setLoading(isLoading) {
    if (isLoading) {
        // Disable inputs and button
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        loginButton.disabled = true;
        
        // Show loading indicators
        spinner.style.display = 'inline-block';
        loginLoading.style.display = 'block';
        
        // Change button text
        loginButton.textContent = 'Logging in...';
    } else {
        // Enable inputs and button
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        loginButton.disabled = false;
        
        // Hide loading indicators
        spinner.style.display = 'none';
        loginLoading.style.display = 'none';
        
        // Restore button text
        loginButton.textContent = 'Login';
    }
}

async function login() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    // Show loading state
    setLoading(true);
    
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
            // Small delay to show loading state (optional)
            setTimeout(() => {
                // Show admin panel
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block';
                
                // Show username in admin panel
                document.getElementById('logged-in-user').textContent = username;
                
                // Store login state
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminUsername', username);
                
                // Reset loading state
                setLoading(false);
                
                console.log('Admin logged in successfully');
            }, 500); // Optional: smooth transition
        } else {
            // Reset loading state
            setLoading(false);
            alert('Login failed: ' + (data.message || 'Invalid credentials'));
        }
    } catch (error) {
        // Reset loading state
        setLoading(false);
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
    
    // Clear and enable input fields
    usernameInput.value = '';
    passwordInput.value = '';
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    loginButton.disabled = false;
    
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