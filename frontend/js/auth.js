// auth.js
// Handles both registration and login.

function showMessage(elementId, message, type = 'danger') {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="alert alert-${type} py-2 mb-0">${message}</div>`;
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async event => {
        event.preventDefault();

        const button = document.getElementById('registerButton');
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            showMessage('registerMessage', 'Passwords do not match.');
            return;
        }

        const payload = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            password,
            year: Number(document.getElementById('year').value),
            branch: document.getElementById('branch').value.trim()
        };

        button.disabled = true;
        button.textContent = 'Creating account...';

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Registration failed.');

            showMessage('registerMessage', 'Account created. Redirecting...', 'success');
            setTimeout(() => window.location.href = 'index.html', 500);
        } catch (error) {
            console.error(error);
            showMessage('registerMessage', error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Create account';
        }
    });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async event => {
        event.preventDefault();

        const button = document.getElementById('loginButton');
        const payload = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        button.disabled = true;
        button.textContent = 'Logging in...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Login failed.');

            window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
        } catch (error) {
            console.error(error);
            showMessage('loginMessage', error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Log in';
        }
    });
}
