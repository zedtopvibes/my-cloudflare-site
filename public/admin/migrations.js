// Check authentication
if (localStorage.getItem('adminLoggedIn') !== 'true') {
    document.getElementById('auth-check').style.display = 'block';
    document.getElementById('migrations-admin').style.display = 'none';
} else {
    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('migrations-admin').style.display = 'block';
    checkMigrationStatus();
}

async function checkMigrationStatus() {
    try {
        const response = await fetch('/api/migrations/status');
        const data = await response.json();
        
        if (data.success) {
            console.log('Migration status:', data.migrations);
            // You can update UI based on which migrations are already run
        }
    } catch (error) {
        console.error('Error checking migrations:', error);
    }
}

async function runMigration(number) {
    if (!confirm(`Are you sure you want to run migration ${number}? This will modify your database.`)) {
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Running...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/migrate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'admin-secret' // In production, use proper auth
            },
            body: JSON.stringify({ migration: number })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Migration successful!');
            location.reload();
        } else {
            alert('Migration failed: ' + data.message);
            button.textContent = originalText;
            button.disabled = false;
        }
    } catch (error) {
        alert('Error: ' + error.message);
        button.textContent = originalText;
        button.disabled = false;
    }
}