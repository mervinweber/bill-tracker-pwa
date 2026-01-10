/**
 * Authentication Modal Component
 * 
 * Handles user login and sign-up modal interface with email/password fields.
 * Provides modal window for authentication and message feedback.
 * 
 * Modal Features:
 * - Email input field with validation
 * - Password input field with masking
 * - Login button for existing users
 * - Sign Up button for new users
 * - Error/success message display area
 * - Close button and backdrop click to dismiss
 * - Keyboard accessible form controls
 * 
 * @module authModal
 */

/**
 * Initialize authentication modal with login and signup handlers
 * 
 * @function initializeAuthModal
 * @param {Object} actions - Action handlers object
 * @param {Function} actions.onLogin - Callback for login button click
 *   Receives (email, password) parameters
 * @param {Function} actions.onSignUp - Callback for signup button click
 *   Receives (email, password) parameters
 * 
 * @returns {void}
 * 
 * @description Creates modal HTML structure, injects into DOM,
 *   and attaches event listeners for all form controls.
 *   Called during app initialization to set up authentication UI.
 *   Modal is hidden by default until openAuthModal() is called.
 * 
 * @accessibility
 * - Form controls properly labeled with <label> elements
 * - Close button accessible via click and backdrop click
 * - Email and password inputs have required attribute
 * - Modal overlay has semantic structure for screen readers
 * 
 * @example
 * initializeAuthModal({
 *   onLogin: async (email, password) => {
 *     // Handle login logic
 *   },
 *   onSignUp: async (email, password) => {
 *     // Handle signup logic
 *   }
 * });
 */
export const initializeAuthModal = (actions) => {
    const modalHTML = `
        <div id="authModal" class="modal-overlay">
            <div class="modal">
                <span class="close" id="closeAuthModal">&times;</span>
                <h2 id="authTitle">Login / Sign Up</h2>
                <div class="form-group">
                    <label for="authEmail">Email</label>
                    <input type="email" id="authEmail" required>
                </div>
                <div class="form-group">
                    <label for="authPassword">Password</label>
                    <input type="password" id="authPassword" required>
                </div>
                <div id="authMessage" style="color: red; margin-bottom: 10px; font-size: 14px;"></div>
                <button id="loginBtn" class="submit-btn" style="margin-bottom: 10px;">Log In</button>
                <button id="signUpBtn" class="submit-btn" style="background-color: var(--text-secondary);">Sign Up</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('closeAuthModal');
    const loginBtn = document.getElementById('loginBtn');
    const signUpBtn = document.getElementById('signUpBtn');

    closeBtn.onclick = () => {
        modal.style.display = 'none';
        document.getElementById('authMessage').textContent = '';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    loginBtn.onclick = () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        actions.onLogin(email, password);
    };

    signUpBtn.onclick = () => {
        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;
        actions.onSignUp(email, password);
    };
};

/**
 * Open the authentication modal
 * 
 * @function openAuthModal
 * @returns {void}
 * 
 * @description Sets modal display to 'block' to make it visible.
 *   Called when user clicks login or signup trigger in header/sidebar.
 *   Does not reset form fields - use closeAuthModal() for full reset.
 * 
 * @example
 * openAuthModal(); // Show modal to user
 */
export const openAuthModal = () => {
    document.getElementById('authModal').style.display = 'block';
};

/**
 * Close and reset the authentication modal
 * 
 * @function closeAuthModal
 * @returns {void}
 * 
 * @description Hides modal and clears all form fields and messages.
 *   Ensures previous state doesn't leak into next auth attempt.
 *   Called after successful/failed login or on user-initiated close.
 * 
 * @example
 * closeAuthModal(); // Hide modal and clear form
 */
export const closeAuthModal = () => {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authMessage').textContent = '';
};

/**
 * Display authentication status message in the modal
 * 
 * @function setAuthMessage
 * @param {string} msg - Message text to display
 * @param {boolean} [isError=true] - Whether message is an error (true) or success (false)
 *   - true: Displays in red (danger color)
 *   - false: Displays in green (success color)
 * 
 * @returns {void}
 * 
 * @description Updates the message display area in the modal.
 *   Used to show login errors, validation errors, or success confirmations.
 *   Message persists until next setAuthMessage call or modal close.
 * 
 * @example
 * // Show error message
 * setAuthMessage("Invalid email or password");
 * 
 * // Show success message
 * setAuthMessage("Account created successfully!", false);
 */
export const setAuthMessage = (msg, isError = true) => {
    const el = document.getElementById('authMessage');
    el.textContent = msg;
    el.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
};
