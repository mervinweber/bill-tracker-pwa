export const initializeSidebar = (categories, actions) => {
    const sidebar = document.getElementById('sidebar');

    // Dark Mode Logic - Check localStorage for theme preference on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    let html = '<nav class="sidebar-nav" role="navigation" aria-label="Main navigation">';
    html += '<h2>Categories</h2>';
    html += '<ul class="categories-list" role="group" aria-label="Bill categories">';
    categories.forEach((cat, idx) => {
        html += `<li><button class="category-btn" data-category="${cat}" role="menuitemradio" aria-checked="false" tabindex="${idx === 0 ? '0' : '-1'}">${cat}</button></li>`;
    });
    html += '</ul>';
    
    html += '<div class="sidebar-actions">';
    html += '<button id="addBillBtn" class="add-bill-btn" aria-label="Add a new bill">➕ Add Bill</button>';
    html += '<button id="regenerateBillsBtn" class="regenerate-btn" aria-label="Regenerate all recurring bills for the next pay period" title="Regenerate all recurring bills">🔄 Regenerate</button>';
    html += '</div>';
    
    html += '<div class="backup-controls" role="region" aria-label="Data backup controls">';
    html += '<button id="exportDataBtn" class="action-btn" aria-label="Export bills data to JSON file">⬇️ Export</button>';
    html += '<button id="importDataBtn" class="action-btn" aria-label="Import bills data from JSON file">⬆️ Import</button>';
    html += '<input type="file" id="importFileInput" accept=".json" style="display: none;" aria-label="Select JSON file to import">';
    html += '</div>';

    // Theme Toggle HTML
    html += `
        <div class="theme-toggle-container" role="region" aria-label="Theme settings">
            <label for="themeToggle" class="theme-label">Dark Mode</label>
            <label class="theme-switch" aria-label="Toggle dark mode">
                <input type="checkbox" id="themeToggle" aria-checked="${savedTheme === 'dark' ? 'true' : 'false'}" ${savedTheme === 'dark' ? 'checked' : ''}>
                <span class="slider" aria-hidden="true"></span>
            </label>
        </div>
    `;

    // Auth Button
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        html += `<div class="auth-info" role="region" aria-label="Account information"><p class="user-email">Logged in as:<br><span>${userEmail}</span></p><button id="authBtn" class="action-btn" aria-label="Logout from cloud sync">🚪 Logout</button></div>`;
    } else {
        html += `<button id="authBtn" class="action-btn" aria-label="Login to enable cloud sync">☁️ Sync (Login)</button>`;
    }

    html += '</nav>';
    sidebar.innerHTML = html;

    // Theme Toggle Event Listener
    document.getElementById('themeToggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            e.target.setAttribute('aria-checked', 'true');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            e.target.setAttribute('aria-checked', 'false');
            localStorage.setItem('theme', 'light');
        }
    });

    document.getElementById('authBtn').addEventListener('click', () => {
        if (userEmail) {
            actions.onLogout();
        } else {
            actions.onOpenAuth();
        }
    });

    // Category button management with keyboard navigation
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach((btn, idx) => {
        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-checked', 'false');
                b.setAttribute('tabindex', '-1');
            });
            e.target.classList.add('active');
            e.target.setAttribute('aria-checked', 'true');
            e.target.setAttribute('tabindex', '0');
            e.target.focus();
            actions.onCategorySelect(e.target.dataset.category);
        });
        
        // Keyboard navigation for categories (arrow keys)
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextBtn = btn.nextElementSibling?.querySelector('.category-btn') || categoryBtns[0];
                nextBtn.focus();
                nextBtn.click();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevBtn = btn.previousElementSibling?.querySelector('.category-btn') || categoryBtns[categoryBtns.length - 1];
                prevBtn.focus();
                prevBtn.click();
            }
        });
    });

    document.getElementById('addBillBtn').addEventListener('click', () => {
        actions.onOpenAddBill();
    });

    document.getElementById('regenerateBillsBtn').addEventListener('click', () => {
        actions.onRegenerateBills();
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
        actions.onExportData();
    });

    const fileInput = document.getElementById('importFileInput');
    document.getElementById('importDataBtn').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            actions.onImportData(e.target.files[0]);
            fileInput.value = ''; // Reset so same file can be selected again
        }
    });
};