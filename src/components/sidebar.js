export const initializeSidebar = (categories, actions) => {
    const sidebar = document.getElementById('sidebar');

    // Dark Mode Logic - Check localStorage for theme preference on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    let html = '<h2>Categories</h2><ul>';
    categories.forEach(cat => {
        html += `<li><button class="category-btn" data-category="${cat}">${cat}</button></li>`;
    });
    html += '</ul><button id="addBillBtn" class="add-bill-btn">+ Add Bill</button>';
    html += '<button id="regenerateBillsBtn" class="regenerate-btn" title="Regenerate all recurring bills">🔄 Regenerate Bills</button>';
    html += '<div class="backup-controls">';
    html += '<button id="exportDataBtn" class="action-btn">⬇️ Export Data</button>';
    html += '<button id="importDataBtn" class="action-btn">⬆️ Import Data</button>';
    html += '<input type="file" id="importFileInput" accept=".json" style="display: none;">';
    html += '</div>';

    // Theme Toggle HTML
    html += `
        <div class="theme-toggle-container">
            <span>Dark Mode</span>
            <label class="theme-switch">
                <input type="checkbox" id="themeToggle" ${savedTheme === 'dark' ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    `;

    // Auth Button
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary);">Logged in as: ${userEmail}</div>`;
        html += `<button id="authBtn" class="action-btn" style="margin-top: 5px;">Logout</button>`;
    } else {
        html += `<button id="authBtn" class="action-btn" style="margin-top: 15px;">☁️ Sync (Login)</button>`;
    }

    sidebar.innerHTML = html;

    // Theme Toggle Event Listener
    document.getElementById('themeToggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
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

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            actions.onCategorySelect(e.target.dataset.category);
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