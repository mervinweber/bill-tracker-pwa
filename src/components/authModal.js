/**
 * Authentication Modal Component
 * 
 * Handles user login and sign-up modal interface with modern UI.
 * Provides modal window for authentication and message feedback.
 * 
 * @module authModal
 */

/**
 * Initialize authentication modal with login and signup handlers
 * 
 * @function initializeAuthModal
 * @param {Object} actions - Action handlers object
 * @param {Function} actions.onLogin - Callback for login button click
 * @param {Function} actions.onSignUp - Callback for signup button click
 * @param {Function} actions.onResetPassword - Callback for password reset link click
 */
export const initializeAuthModal = (actions) => {
    const modalHTML = `
        <div id="authModal" class="auth-modal-overlay">
            <div class="auth-card">
                <button class="auth-close" id="closeAuthModal" aria-label="Close modal">&times;</button>
                
                <div class="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to sync your bills across devices</p>
                </div>

                <div class="auth-form">
                    <div class="auth-input-group">
                        <label for="authEmail">Email Address</label>
                        <input type="email" id="authEmail" placeholder="name@example.com" required>
                    </div>

                    <div class="auth-input-group">
                        <label for="authPassword">Password</label>
                        <input type="password" id="authPassword" placeholder="••••••••" required>
                        <button id="forgotPasswordLink" class="auth-link-btn" type="button">Forgot Password?</button>
                    </div>

                    <div id="authMessage" class="auth-message"></div>

                    <div class="auth-actions">
                        <button id="loginBtn" class="auth-btn-primary">
                            <span>Log In</span>
                            <div class="btn-loader"></div>
                        </button>
                        <button id="signUpBtn" class="auth-btn-secondary">
                            <span>Create Account</span>
                            <div class="btn-loader"></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('closeAuthModal');
    const loginBtn = document.getElementById('loginBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');

    // Close Logic
    const close = () => {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('authMessage').className = 'auth-message';
            document.getElementById('authMessage').textContent = '';
            document.getElementById('authMessage').style.display = 'none';
        }, 300);
    };

    closeBtn.onclick = close;

    window.onclick = (event) => {
        if (event.target === modal) {
            close();
        }
    };

    // Helper to handle async actions with loading state
    const handleAuthAction = async (btn, callback) => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            setAuthMessage('Please enter both email and password', true);
            return;
        }

        // Set Loading
        btn.classList.add('loading');
        btn.disabled = true;
        setAuthMessage('', false); // Clear previous messages
        document.getElementById('authMessage').style.display = 'none';

        try {
            await callback(email, password);
        } catch (error) {
            console.error(error);
            setAuthMessage(error.message || 'An error occurred', true);
        } finally {
            // Reset Loading
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    };

    loginBtn.onclick = () => handleAuthAction(loginBtn, actions.onLogin);
    signUpBtn.onclick = () => handleAuthAction(signUpBtn, actions.onSignUp);

    document.getElementById('forgotPasswordLink').onclick = () => {
        const email = emailInput.value.trim();
        if (!email) {
            setAuthMessage('Please enter your email address first', true);
            emailInput.focus();
            return;
        }
        actions.onResetPassword(email);
    };

    // Allow Enter key to submit
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuthAction(loginBtn, actions.onLogin);
        }
    });
};

/**
 * Open the authentication modal
 */
export const openAuthModal = () => {
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    // Force reflow to enable transition
    void modal.offsetWidth;
    modal.classList.add('visible');

    // Auto focus
    setTimeout(() => {
        document.getElementById('authEmail').focus();
    }, 100);
};

/**
 * Close and reset the authentication modal
 */
export const closeAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('authMessage').className = 'auth-message';
        document.getElementById('authMessage').style.display = 'none';
    }, 300);
};

/**
 * Display authentication status message
 */
export const setAuthMessage = (msg, isError = true) => {
    const el = document.getElementById('authMessage');
    if (!msg) {
        el.style.display = 'none';
        return;
    }
    el.textContent = msg;
    el.className = `auth-message ${isError ? 'error' : 'success'}`;
    el.style.display = 'block';
};

