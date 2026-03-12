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

import { isSupabaseConfigured } from '../services/supabase.js';

export const initializeSidebar = (categories, actions) => {
    const sidebar = document.getElementById('sidebar');
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Shadcn-like styling constants
    const btnBase = "inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80`;
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground justify-start px-3 h-10`;
    const btnOutline = `${btnBase} border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground`;
    const btnPrimary = `${btnBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
    const btnDanger = `${btnBase} bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90`;

    sidebar.innerHTML = '';
    sidebar.className = "flex w-full flex-col border-r bg-muted/30 py-6 pl-2 pr-4 md:flex shrink-0";

    const nav = document.createElement('nav');
    nav.className = "flex h-full flex-col gap-6";
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    // Categories Section
    const catSection = document.createElement('div');
    catSection.className = "space-y-4";

    const catHeader = document.createElement('h2');
    catHeader.className = "px-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2";
    catHeader.textContent = 'Categories';
    catSection.appendChild(catHeader);

    const catList = document.createElement('ul');
    catList.className = "flex flex-col gap-1";
    catList.setAttribute('role', 'group');
    catList.setAttribute('aria-label', 'Bill categories');

    categories.forEach((cat, idx) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = `${btnGhost} w-full category-btn`;
        btn.dataset.category = cat;
        btn.setAttribute('role', 'menuitemradio');
        btn.setAttribute('aria-checked', 'false');
        btn.tabIndex = idx === 0 ? 0 : -1;
        btn.textContent = cat;
        li.appendChild(btn);
        catList.appendChild(li);
    });
    catSection.appendChild(catList);
    nav.appendChild(catSection);

    // Sidebar Actions Section
    const actionsSection = document.createElement('div');
    actionsSection.className = "space-y-4";

    const actionsHeader = document.createElement('h3');
    actionsHeader.className = "px-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2";
    actionsHeader.textContent = 'Actions';
    actionsSection.appendChild(actionsHeader);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = "flex flex-col gap-2";

    const addBtn = document.createElement('button');
    addBtn.id = 'addBillBtn';
    addBtn.className = `${btnPrimary} w-full gap-2 h-10`;
    addBtn.ariaLabel = 'Add a new bill';
    addBtn.innerHTML = '<span class="mr-3 text-base">➕</span> <span>Add Bill</span>';
    addBtn.addEventListener('click', actions.onOpenAddBill);
    actionsDiv.appendChild(addBtn);

    const regenBtn = document.createElement('button');
    regenBtn.id = 'regenerateBillsBtn';
    regenBtn.className = `${btnSecondary} w-full gap-2 h-10`;
    regenBtn.ariaLabel = 'Regenerate all recurring bills for the next pay period';
    regenBtn.innerHTML = '<span class="mr-3 text-base">🔄</span> <span>Regenerate</span>';
    regenBtn.addEventListener('click', actions.onRegenerateBills);
    actionsDiv.appendChild(regenBtn);

    actionsSection.appendChild(actionsDiv);
    nav.appendChild(actionsSection);

    // Data Management Section
    const dataSection = document.createElement('div');
    dataSection.className = "space-y-4";

    const dataHeader = document.createElement('h3');
    dataHeader.className = "px-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/70 mb-2";
    dataHeader.textContent = 'Data Management';
    dataSection.appendChild(dataHeader);

    const dataDiv = document.createElement('div');
    dataDiv.className = "flex flex-col gap-2";

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportDataBtn';
    exportBtn.className = `${btnOutline} w-full gap-2 h-9 border-dashed`;
    exportBtn.ariaLabel = 'Export bills data to JSON file';
    exportBtn.innerHTML = '<span class="mr-3 text-base">⬇️</span> <span>Export</span>';
    exportBtn.addEventListener('click', actions.onExportData);
    dataDiv.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.id = 'importDataBtn';
    importBtn.className = `${btnOutline} w-full gap-2 h-9 border-dashed`;
    importBtn.ariaLabel = 'Import bills data from JSON file';
    importBtn.innerHTML = '<span class="mr-3 text-base">⬆️</span> <span>Import</span>';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'importFileInput';
    fileInput.accept = '.json';
    fileInput.className = "sr-only";
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            actions.onImportData(e.target.files[0]);
            fileInput.value = '';
        }
    });

    importBtn.addEventListener('click', () => fileInput.click());
    dataDiv.appendChild(importBtn);
    dataDiv.appendChild(fileInput);

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settingsBtn';
    settingsBtn.className = `${btnSecondary} w-full gap-2 h-9`;
    settingsBtn.ariaLabel = 'Open settings';
    settingsBtn.innerHTML = '<span class="mr-3 text-base">⚙️</span> <span>Settings</span>';
    settingsBtn.addEventListener('click', actions.onShowSettings);
    dataDiv.appendChild(settingsBtn);

    const bulkPaidBtn = document.createElement('button');
    bulkPaidBtn.id = 'bulkMarkPaidBtn';
    bulkPaidBtn.className = `${btnSecondary} w-full gap-2 h-9`;
    bulkPaidBtn.ariaLabel = 'Mark all paid';
    bulkPaidBtn.innerHTML = '<span class="mr-3 text-base">✅</span> <span>Mark All Paid</span>';
    bulkPaidBtn.addEventListener('click', actions.onBulkMarkPaid);
    dataDiv.appendChild(bulkPaidBtn);

    const bulkDelBtn = document.createElement('button');
    bulkDelBtn.id = 'bulkDeleteBtn';
    bulkDelBtn.className = `${btnDanger} w-full gap-2 h-9`;
    bulkDelBtn.ariaLabel = 'Delete all data';
    bulkDelBtn.innerHTML = '<span class="mr-3 text-base">🗑️</span> <span>Clear All</span>';
    bulkDelBtn.addEventListener('click', actions.onBulkDelete);
    dataDiv.appendChild(bulkDelBtn);

    dataSection.appendChild(dataDiv);
    nav.appendChild(dataSection);

    // Bottom Section (Theme + Auth)
    const bottomSection = document.createElement('div');
    bottomSection.className = "mt-auto space-y-4 pt-4 border-t";

    const themeDiv = document.createElement('div');
    themeDiv.className = "flex items-center justify-between px-2";

    const themeLabel = document.createElement('span');
    themeLabel.className = "text-sm font-medium";
    themeLabel.textContent = "Dark Mode";
    themeDiv.appendChild(themeLabel);

    const themeSwitch = document.createElement('label');
    themeSwitch.className = "relative inline-flex cursor-pointer items-center transition-opacity hover:opacity-80";

    const themeInput = document.createElement('input');
    themeInput.type = 'checkbox';
    themeInput.id = 'themeToggle';
    themeInput.className = "peer sr-only";
    themeInput.checked = savedTheme === 'dark';
    themeInput.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });

    const switchTrack = document.createElement('div');
    switchTrack.className = "peer h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring";

    themeSwitch.appendChild(themeInput);
    themeSwitch.appendChild(switchTrack);
    themeDiv.appendChild(themeSwitch);
    bottomSection.appendChild(themeDiv);

    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
        const authDiv = document.createElement('div');
        authDiv.className = "rounded-lg bg-muted/50 p-3 space-y-3";

        const emailDiv = document.createElement('div');
        emailDiv.className = "text-[11px] leading-tight text-muted-foreground uppercase font-bold";
        emailDiv.textContent = "Account";
        authDiv.appendChild(emailDiv);

        const emailText = document.createElement('div');
        emailText.className = "text-xs font-semibold truncate";
        emailText.textContent = userEmail;
        authDiv.appendChild(emailText);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = `${btnOutline} w-full h-8 px-2 text-xs`;
        logoutBtn.innerHTML = '<span class="mr-2">🚪</span> <span>Logout</span>';
        logoutBtn.addEventListener('click', actions.onLogout);
        authDiv.appendChild(logoutBtn);

        bottomSection.appendChild(authDiv);
    } else if (isSupabaseConfigured()) {
        const loginBtn = document.createElement('button');
        loginBtn.className = `${btnPrimary} w-full h-9 text-xs`;
        loginBtn.innerHTML = '<span class="mr-2">☁️</span> <span>Login to Sync</span>';
        loginBtn.addEventListener('click', actions.onOpenAuth);
        bottomSection.appendChild(loginBtn);
    }

    nav.appendChild(bottomSection);
    sidebar.appendChild(nav);

    // Interaction Logic
    const categoryBtns = nav.querySelectorAll('.category-btn');
    categoryBtns.forEach((btn) => {
        const activeClass = "bg-accent text-accent-foreground font-semibold";

        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => {
                b.classList.remove(...activeClass.split(' '));
                b.setAttribute('aria-checked', 'false');
                b.tabIndex = -1;
            });
            btn.classList.add(...activeClass.split(' '));
            btn.setAttribute('aria-checked', 'true');
            btn.tabIndex = 0;
            actions.onCategorySelect(btn.dataset.category);
        });

        // Keyboard navigation
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
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