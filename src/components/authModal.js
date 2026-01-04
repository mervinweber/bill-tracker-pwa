
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

export const openAuthModal = () => {
    document.getElementById('authModal').style.display = 'block';
};

export const closeAuthModal = () => {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authMessage').textContent = '';
};

export const setAuthMessage = (msg, isError = true) => {
    const el = document.getElementById('authMessage');
    el.textContent = msg;
    el.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
};
