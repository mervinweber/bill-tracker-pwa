/**
 * Authentication Modal Component
 * 
 * Handles user login and sign-up modal interface with modern UI.
 * Provides modal window for authentication and message feedback.
 * 
 * @module authModal
 */

import logger from '../utils/logger.js';

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
    // Shadcn-like styling constants
    const inputBase = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
    const labelBase = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";
    const btnBase = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`;
    const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground h-9 w-9 p-0`;
    const linkBase = "text-xs text-muted-foreground underline-offset-4 hover:underline";

    const modalHTML = `
        <div id="authModal" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" style="display: none;">
            <div class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
                <div class="flex flex-col space-y-1.5 text-center">
                    <h2 class="text-xl font-semibold leading-none tracking-tight">Welcome Back</h2>
                    <p class="text-sm text-muted-foreground">Sign in to sync your bills across devices</p>
                </div>
                
                <button class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" id="closeAuthModal" aria-label="Close modal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                    <span class="sr-only">Close</span>
                </button>

                <div class="space-y-4">
                    <div class="grid gap-2">
                        <label for="authEmail" class="${labelBase}">Email Address</label>
                        <input type="email" id="authEmail" placeholder="name@example.com" required class="${inputBase}">
                    </div>

                    <div class="grid gap-2">
                        <div class="flex items-center justify-between">
                            <label for="authPassword" class="${labelBase}">Password</label>
                            <button id="forgotPasswordLink" class="${linkBase}" type="button">Forgot Password?</button>
                        </div>
                        <input type="password" id="authPassword" placeholder="••••••••" required class="${inputBase}">
                    </div>

                    <div id="authMessage" class="hidden rounded-md bg-destructive/15 p-3 text-xs text-destructive"></div>

                    <div class="flex flex-col gap-2 pt-2">
                        <button id="loginBtn" class="${btnPrimary} w-full relative group">
                            <span class="group-[.loading]:invisible">Log In</span>
                            <div class="absolute inset-0 flex items-center justify-center invisible group-[.loading]:visible">
                                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        </button>
                        <button id="signUpBtn" class="${btnSecondary} w-full relative group">
                            <span class="group-[.loading]:invisible">Create Account</span>
                            <div class="absolute inset-0 flex items-center justify-center invisible group-[.loading]:visible">
                                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
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
    const emailInput = /** @type {HTMLInputElement} */ (document.getElementById('authEmail'));
    const passwordInput = /** @type {HTMLInputElement} */ (document.getElementById('authPassword'));

    const close = () => {
        modal.classList.remove('visible', 'animate-in', 'fade-in-0');
        setTimeout(() => {
            modal.style.display = 'none';
            setAuthMessage('');
        }, 200);
    };

    closeBtn.onclick = close;

    window.onclick = (event) => {
        if (event.target === modal) {
            close();
        }
    };

    const handleAuthAction = async (btn, callback) => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            setAuthMessage('Please enter both email and password', true);
            return;
        }

        btn.classList.add('loading');
        btn.disabled = true;
        setAuthMessage('');

        try {
            await callback(email, password);
        } catch (error) {
            logger.error('Auth modal action failed', error);
            setAuthMessage(error.message || 'An error occurred', true);
        } finally {
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

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAuthAction(loginBtn, actions.onLogin);
        }
    });
};

export const openAuthModal = () => {
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    modal.classList.add('visible', 'animate-in', 'fade-in-0');

    setTimeout(() => {
        document.getElementById('authEmail').focus();
    }, 100);
};

export const closeAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.classList.remove('visible', 'animate-in', 'fade-in-0');
    setTimeout(() => {
        modal.style.display = 'none';
        /** @type {HTMLInputElement} */ (document.getElementById('authEmail')).value = '';
        /** @type {HTMLInputElement} */ (document.getElementById('authPassword')).value = '';
        setAuthMessage('');
    }, 200);
};

export const setAuthMessage = (msg, isError = true) => {
    const el = document.getElementById('authMessage');
    if (!msg) {
        el.classList.add('hidden');
        return;
    }
    el.textContent = msg;
    el.className = `rounded-md p-3 text-xs ${isError ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-600'}`;
    el.classList.remove('hidden');
};
