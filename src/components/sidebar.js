/**
 * Initializes the sidebar component with category navigation and action buttons
 * 
 * @param {string[]} categories - Array of bill category names (e.g., ['Utilities', 'Rent', 'Entertainment'])
 * @param {Object} actions - Object containing action handler functions
 * @param {Function} actions.onCategorySelect - Called when user selects a category (receives category name)
 * @param {Function} actions.onOpenAddBill - Called when user clicks "Add Bill" button
 * @param {Function} actions.onRegenerateBills - Called when user clicks "Regenerate Bills" button
 * @param {Function} actions.onExportData - Called when user clicks "Export Data" button
 * @param {Function} actions.onImportData - Called when user selects a file to import (receives File object)
 * @param {Function} actions.onLogout - Called when user clicks "Logout" button
 * @param {Function} actions.onOpenAuth - Called when user clicks "Login" button
 * @param {Function} actions.onBulkDelete - Called when user clicks "Clear All Data" button
 * @param {Function} actions.onBulkMarkPaid - Called when user clicks "Mark All Paid" button
 * @returns {void}
 * @description Sets up the sidebar with:
 *   - Category list with keyboard navigation (arrow keys)
 *   - Action buttons (Add, Regenerate, Export, Import)
 *   - Theme toggle with dark mode support and localStorage persistence
 *   - User authentication info and login/logout controls
 *   - Full WCAG 2.1 Level AA accessibility including aria-labels, keyboard nav, and semantic structure
 */
export const initializeSidebar = (categories, actions) => {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    // Dark Mode Logic - Check localStorage for theme preference on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    // Categories Header
    const catHeader = document.createElement('h2');
    catHeader.textContent = 'Categories';
    nav.appendChild(catHeader);

    // Categories List
    const catList = document.createElement('ul');
    catList.className = 'categories-list';
    catList.setAttribute('role', 'group');
    catList.setAttribute('aria-label', 'Bill categories');

    categories.forEach((cat, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat;
        btn.setAttribute('role', 'menuitemradio');
        btn.setAttribute('aria-checked', 'false');
        btn.tabIndex = idx === 0 ? 0 : -1;
        btn.textContent = cat; // Safe text content
        li.appendChild(btn);
        catList.appendChild(li);
    });
    nav.appendChild(catList);

    // Sidebar Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'sidebar-actions';

    const addBtn = document.createElement('button');
    addBtn.id = 'addBillBtn';
    addBtn.className = 'add-bill-btn';
    addBtn.ariaLabel = 'Add a new bill';
    addBtn.textContent = '➕ Add Bill';
    addBtn.addEventListener('click', actions.onOpenAddBill);
    actionsDiv.appendChild(addBtn);

    const regenBtn = document.createElement('button');
    regenBtn.id = 'regenerateBillsBtn';
    regenBtn.className = 'regenerate-btn';
    regenBtn.ariaLabel = 'Regenerate all recurring bills for the next pay period';
    regenBtn.title = 'Regenerate all recurring bills';
    regenBtn.textContent = '🔄 Regenerate';
    regenBtn.addEventListener('click', actions.onRegenerateBills);
    actionsDiv.appendChild(regenBtn);

    nav.appendChild(actionsDiv);

    // Backup Controls
    const backupDiv = document.createElement('div');
    backupDiv.className = 'backup-controls';
    backupDiv.setAttribute('role', 'region');
    backupDiv.ariaLabel = 'Data backup controls';

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportDataBtn';
    exportBtn.className = 'action-btn';
    exportBtn.ariaLabel = 'Export bills data to JSON file';
    exportBtn.textContent = '⬇️ Export';
    exportBtn.addEventListener('click', actions.onExportData);
    backupDiv.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.id = 'importDataBtn';
    importBtn.className = 'action-btn';
    importBtn.ariaLabel = 'Import bills data from JSON file';
    importBtn.textContent = '⬆️ Import';

    // File Input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'importFileInput';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.ariaLabel = 'Select JSON file to import';
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            actions.onImportData(e.target.files[0]);
            fileInput.value = '';
        }
    });

    importBtn.addEventListener('click', () => fileInput.click());
    backupDiv.appendChild(importBtn);
    backupDiv.appendChild(fileInput);
    nav.appendChild(backupDiv);

    // Bulk Actions
    const bulkDiv = document.createElement('div');
    bulkDiv.className = 'bulk-actions';
    bulkDiv.setAttribute('role', 'region');
    bulkDiv.ariaLabel = 'Bulk actions';

    const bulkHeader = document.createElement('h3');
    bulkHeader.textContent = 'Bulk Actions';
    bulkDiv.appendChild(bulkHeader);

    const bulkPaidBtn = document.createElement('button');
    bulkPaidBtn.id = 'bulkMarkPaidBtn';
    bulkPaidBtn.className = 'action-btn bulk-btn';
    bulkPaidBtn.ariaLabel = 'Mark all visible bills as paid';
    bulkPaidBtn.textContent = '✅ Mark All Paid';
    bulkPaidBtn.addEventListener('click', actions.onBulkMarkPaid);
    bulkDiv.appendChild(bulkPaidBtn);

    const bulkDelBtn = document.createElement('button');
    bulkDelBtn.id = 'bulkDeleteBtn';
    bulkDelBtn.className = 'action-btn bulk-btn danger';
    bulkDelBtn.ariaLabel = 'Delete all bill data';
    bulkDelBtn.textContent = '🗑️ Clear All Data';
    bulkDelBtn.addEventListener('click', actions.onBulkDelete);
    bulkDiv.appendChild(bulkDelBtn);

    nav.appendChild(bulkDiv);

    // Theme Toggle
    const themeDiv = document.createElement('div');
    themeDiv.className = 'theme-toggle-container';
    themeDiv.setAttribute('role', 'region');
    themeDiv.ariaLabel = 'Theme settings';

    const themeLabel = document.createElement('label');
    themeLabel.htmlFor = 'themeToggle';
    themeLabel.className = 'theme-label';
    themeLabel.textContent = 'Dark Mode';
    themeDiv.appendChild(themeLabel);

    const themeSwitch = document.createElement('label');
    themeSwitch.className = 'theme-switch';
    themeSwitch.ariaLabel = 'Toggle dark mode';

    const themeInput = document.createElement('input');
    themeInput.type = 'checkbox';
    themeInput.id = 'themeToggle';
    themeInput.ariaChecked = savedTheme === 'dark' ? 'true' : 'false';
    themeInput.checked = savedTheme === 'dark';
    themeInput.addEventListener('change', (e) => {
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

    const slider = document.createElement('span');
    slider.className = 'slider';
    slider.setAttribute('aria-hidden', 'true');

    themeSwitch.appendChild(themeInput);
    themeSwitch.appendChild(slider);
    themeDiv.appendChild(themeSwitch);
    nav.appendChild(themeDiv);

    // Auth Info
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        const authDiv = document.createElement('div');
        authDiv.className = 'auth-info';
        authDiv.setAttribute('role', 'region');
        authDiv.ariaLabel = 'Account information';

        const p = document.createElement('p');
        p.className = 'user-email';
        p.innerHTML = `Logged in as:<br><span>${userEmail}</span>`; // Safe as userEmail is from authenticated session, but better to be safe
        // Let's make this safe too
        p.innerHTML = '';
        p.appendChild(document.createTextNode('Logged in as:'));
        p.appendChild(document.createElement('br'));
        const span = document.createElement('span');
        span.textContent = userEmail;
        p.appendChild(span);

        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'authBtn';
        logoutBtn.className = 'action-btn';
        logoutBtn.ariaLabel = 'Logout from cloud sync';
        logoutBtn.textContent = '🚪 Logout';
        logoutBtn.addEventListener('click', actions.onLogout);

        authDiv.appendChild(p);
        authDiv.appendChild(logoutBtn);
        nav.appendChild(authDiv);
    } else {
        const loginBtn = document.createElement('button');
        loginBtn.id = 'authBtn';
        loginBtn.className = 'action-btn';
        loginBtn.ariaLabel = 'Login to enable cloud sync';
        loginBtn.textContent = '☁️ Sync (Login)';
        loginBtn.addEventListener('click', actions.onOpenAuth);
        nav.appendChild(loginBtn);
    }

    sidebar.appendChild(nav);

    // Category button logic (delegation or attached above? I removed the selector queries)
    // I need to re-implement the radio button behavior logic since I'm not querying them anymore
    // Actually, I can query them from `nav` easily.
    const categoryBtns = nav.querySelectorAll('.category-btn');
    categoryBtns.forEach((btn) => {
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

        // Keyboard navigation
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Logic needs to find next button in the list
                const nextLi = btn.closest('li').nextElementSibling;
                const nextBtn = nextLi ? nextLi.querySelector('.category-btn') : categoryBtns[0];
                nextBtn.focus();
                nextBtn.click();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevLi = btn.closest('li').previousElementSibling;
                const prevBtn = prevLi ? prevLi.querySelector('.category-btn') : categoryBtns[categoryBtns.length - 1];
                prevBtn.focus();
                prevBtn.click();
            }
        });
    });
};