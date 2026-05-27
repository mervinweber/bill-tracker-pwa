/**
 * Initializes the sidebar component with category navigation and action buttons
 * 
 * @param {string[]} categories - Array of bill category names (e.g., ['Utilities', 'Rent', 'Entertainment'])
 * @param {Object} actions - Object containing action handler functions
 * @param {Function} actions.onCategorySelect - Called when user selects a category (receives category name)
 * @param {Function} actions.onOpenAddBill - Called when user clicks "Add Bill" button
 * @param {Function} actions.onRegenerateBills - Called when user clicks "Regenerate Bills" button
 * @param {Function} actions.onExportData - Called when user clicks "Export Data" button
 * @param {Function} [actions.onExportCsv] - Called when user clicks "Export CSV" button
 * @param {Function} actions.onImportData - Called when user selects a file to import (receives File object)
 * @param {Function} actions.onLogout - Called when user clicks "Logout" button
 * @param {Function} actions.onOpenAuth - Called when user clicks "Login" button
 * @param {Function} actions.onShowSettings - Called when user clicks "Settings" button
 * @param {Function} actions.onBulkDelete - Called when user clicks "Clear All Data" button
 * @param {Function} actions.onBulkMarkPaid - Called when user clicks "Mark All Paid" button
 * @param {Function} actions.onBulkFillBalances - Called when user clicks "Fill Balance" button
 * @param {Function} actions.onCleanupDuplicates - Called when user clicks "Cleanup Dupes" button
 * @returns {void}
 * @description Sets up the sidebar with:
 *   - Category list with keyboard navigation (arrow keys)
 *   - Action buttons (Add, Regenerate, Export, Import)
 *   - Theme toggle with dark mode support and localStorage persistence
 *   - User authentication info and login/logout controls
 *   - Full WCAG 2.1 Level AA accessibility including aria-labels, keyboard nav, and semantic structure
 */

import StorageManager from '../utils/StorageManager.js';
import { STORAGE_KEYS } from '../utils/constants.js';

const MOBILE_SIDEBAR_TOGGLE_EVENT = 'billtracker:toggle-mobile-sidebar';

const isMobileSidebarViewport = () => window.innerWidth < 768;

export const initializeSidebar = (categories, actions) => {
    const sidebar = /** @type {HTMLElement} */ (document.getElementById('sidebar'));
    const savedTheme = StorageManager.get(STORAGE_KEYS.THEME, 'light');

    // Shadcn-like styling constants
    const btnBase = "inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const btnSecondary = `${btnBase} bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80`;
    const btnGhost = `${btnBase} hover:bg-accent hover:text-accent-foreground justify-start px-3 h-10`;
    const btnOutline = `${btnBase} border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground`;
    const btnPrimary = `${btnBase} bg-primary text-primary-foreground shadow hover:bg-primary/90`;
    const btnDanger = `${btnBase} bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90`;

    sidebar.innerHTML = '';
    sidebar.className = "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm shrink-0 flex-col overflow-y-auto border-r bg-background/95 px-3 py-4 shadow-xl backdrop-blur transition-transform duration-200 ease-out -translate-x-full md:sticky md:top-[var(--header-height,4.5rem)] md:z-auto md:w-full md:max-w-none md:self-start md:bg-muted/30 md:px-0 md:py-4 md:shadow-none md:backdrop-blur-0 md:translate-x-0 md:max-h-[calc(100vh-var(--header-height,4.5rem)-1rem)]";
    sidebar.setAttribute('aria-hidden', 'true');

    let mobileSidebarOverlay = /** @type {HTMLButtonElement|null} */ (document.getElementById('mobileSidebarOverlay'));
    if (!mobileSidebarOverlay) {
        mobileSidebarOverlay = /** @type {HTMLButtonElement} */ (document.createElement('button'));
        mobileSidebarOverlay.type = 'button';
        mobileSidebarOverlay.id = 'mobileSidebarOverlay';
        mobileSidebarOverlay.className = 'hidden fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] md:hidden';
        mobileSidebarOverlay.setAttribute('aria-label', 'Close navigation menu');
        document.body.appendChild(mobileSidebarOverlay);
    }

    const closeMobileSidebar = () => {
        if (!isMobileSidebarViewport()) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('md:translate-x-0');
            sidebar.setAttribute('aria-hidden', 'false');
            mobileSidebarOverlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            return;
        }

        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        sidebar.setAttribute('aria-hidden', 'true');
        mobileSidebarOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    const openMobileSidebar = () => {
        if (!isMobileSidebarViewport()) {
            return;
        }

        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        sidebar.setAttribute('aria-hidden', 'false');
        mobileSidebarOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    };

    const toggleMobileSidebar = () => {
        const isOpen = sidebar.classList.contains('translate-x-0') && isMobileSidebarViewport();
        if (isOpen) {
            closeMobileSidebar();
            return;
        }

        openMobileSidebar();
    };

    const nav = document.createElement('nav');
    nav.className = "flex h-full flex-col gap-6";
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    const mobileHeader = document.createElement('div');
    mobileHeader.className = 'mb-2 flex items-center justify-between border-b pb-3 md:hidden';

    const mobileTitle = document.createElement('div');
    mobileTitle.className = 'text-sm font-semibold tracking-tight';
    mobileTitle.textContent = 'Navigation';
    mobileHeader.appendChild(mobileTitle);

    const mobileCloseBtn = document.createElement('button');
    mobileCloseBtn.type = 'button';
    mobileCloseBtn.id = 'mobileSidebarCloseBtn';
    mobileCloseBtn.className = `${btnOutline} h-8 px-3 text-xs`;
    mobileCloseBtn.textContent = 'Close';
    mobileCloseBtn.addEventListener('click', closeMobileSidebar);
    mobileHeader.appendChild(mobileCloseBtn);

    nav.appendChild(mobileHeader);

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
    addBtn.type = 'button';
    addBtn.className = `${btnPrimary} w-full gap-2 h-10`;
    addBtn.ariaLabel = 'Add a new bill';
    addBtn.innerHTML = '<span class="mr-3 text-base">➕</span> <span>Add Bill</span>';
    addBtn.addEventListener('click', () => {
        actions.onOpenAddBill();
        closeMobileSidebar();
    });
    actionsDiv.appendChild(addBtn);

    const regenBtn = document.createElement('button');
    regenBtn.id = 'regenerateBillsBtn';
    regenBtn.type = 'button';
    regenBtn.className = `${btnSecondary} w-full gap-2 h-10`;
    regenBtn.ariaLabel = 'Regenerate all recurring bills for the next pay period';
    regenBtn.innerHTML = '<span class="mr-3 text-base">🔄</span> <span>Regenerate</span>';
    regenBtn.addEventListener('click', () => {
        actions.onRegenerateBills();
        closeMobileSidebar();
    });
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
    const dataBtnClass = "w-full gap-2 h-9 text-sm";
    const dataIconClass = "mr-2 text-sm leading-none";

    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportDataBtn';
    exportBtn.type = 'button';
    exportBtn.className = `${btnOutline} ${dataBtnClass} border-dashed`;
    exportBtn.ariaLabel = 'Export bills data to JSON file';
    exportBtn.innerHTML = `<span class="${dataIconClass}">⬇️</span> <span>Export</span>`;
    exportBtn.addEventListener('click', () => {
        actions.onExportData();
        closeMobileSidebar();
    });
    dataDiv.appendChild(exportBtn);

    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.id = 'exportCsvBtn';
    exportCsvBtn.type = 'button';
    exportCsvBtn.className = `${btnOutline} ${dataBtnClass} border-dashed`;
    exportCsvBtn.ariaLabel = 'Export bills data to CSV file';
    exportCsvBtn.innerHTML = `<span class="${dataIconClass}">⬇️</span> <span>Export CSV</span>`;
    exportCsvBtn.addEventListener('click', () => {
        actions.onExportCsv?.();
        closeMobileSidebar();
    });
    dataDiv.appendChild(exportCsvBtn);

    const importBtn = document.createElement('button');
    importBtn.id = 'importDataBtn';
    importBtn.type = 'button';
    importBtn.className = `${btnOutline} ${dataBtnClass} border-dashed`;
    importBtn.ariaLabel = 'Import bills data from JSON file';
    importBtn.innerHTML = `<span class="${dataIconClass}">⬆️</span> <span>Import</span>`;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'importFileInput';
    fileInput.accept = '.json';
    fileInput.className = "sr-only";
    fileInput.addEventListener('change', (e) => {
        const input = /** @type {HTMLInputElement} */ (e.target);
        if (input.files.length > 0) {
            actions.onImportData(input.files[0]);
            fileInput.value = '';
        }
    });

    importBtn.addEventListener('click', () => {
        fileInput.click();
        closeMobileSidebar();
    });
    dataDiv.appendChild(importBtn);
    dataDiv.appendChild(fileInput);

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settingsBtn';
    settingsBtn.type = 'button';
    settingsBtn.className = `${btnOutline} ${dataBtnClass}`;
    settingsBtn.ariaLabel = 'Open settings';
    settingsBtn.innerHTML = `<span class="${dataIconClass}">⚙️</span> <span>Settings</span>`;
    settingsBtn.addEventListener('click', () => {
        actions.onShowSettings();
        closeMobileSidebar();
    });
    dataDiv.appendChild(settingsBtn);

    const userEmail = StorageManager.get(STORAGE_KEYS.USER_EMAIL, null);
    if (!userEmail) {
        const loginBtn = document.createElement('button');
        loginBtn.type = 'button';
        loginBtn.className = `${btnOutline} ${dataBtnClass}`;
        loginBtn.innerHTML = `<span class="${dataIconClass}">☁️</span> <span>Sign In</span>`;
        loginBtn.addEventListener('click', () => {
            actions.onOpenAuth();
            closeMobileSidebar();
        });
        dataDiv.appendChild(loginBtn);
    }

    const bulkPaidBtn = document.createElement('button');
    bulkPaidBtn.id = 'bulkMarkPaidBtn';
    bulkPaidBtn.type = 'button';
    bulkPaidBtn.className = `${btnOutline} ${dataBtnClass}`;
    bulkPaidBtn.ariaLabel = 'Mark all paid';
    bulkPaidBtn.innerHTML = `<span class="${dataIconClass}">✅</span> <span>Mark All Paid</span>`;
    bulkPaidBtn.addEventListener('click', () => {
        actions.onBulkMarkPaid();
        closeMobileSidebar();
    });
    dataDiv.appendChild(bulkPaidBtn);

    const bulkFillBtn = document.createElement('button');
    bulkFillBtn.id = 'bulkFillBalancesBtn';
    bulkFillBtn.type = 'button';
    bulkFillBtn.className = `${btnOutline} ${dataBtnClass}`;
    bulkFillBtn.ariaLabel = 'Fill zero balances with bill amounts';
    bulkFillBtn.innerHTML = `<span class="${dataIconClass}">💰</span> <span>Fill Balance</span>`;
    bulkFillBtn.addEventListener('click', () => {
        actions.onBulkFillBalances();
        closeMobileSidebar();
    });
    dataDiv.appendChild(bulkFillBtn);

    const cleanupDuplicatesBtn = document.createElement('button');
    cleanupDuplicatesBtn.id = 'cleanupDuplicatesBtn';
    cleanupDuplicatesBtn.type = 'button';
    cleanupDuplicatesBtn.className = `${btnOutline} ${dataBtnClass}`;
    cleanupDuplicatesBtn.ariaLabel = 'Clean up exact duplicate bills';
    cleanupDuplicatesBtn.innerHTML = `<span class="${dataIconClass}">🧹</span> <span>Cleanup Dupes</span>`;
    cleanupDuplicatesBtn.addEventListener('click', () => {
        actions.onCleanupDuplicates();
        closeMobileSidebar();
    });
    dataDiv.appendChild(cleanupDuplicatesBtn);

    const bulkDelBtn = document.createElement('button');
    bulkDelBtn.id = 'bulkDeleteBtn';
    bulkDelBtn.type = 'button';
    bulkDelBtn.className = `${btnDanger} ${dataBtnClass}`;
    bulkDelBtn.ariaLabel = 'Delete all data';
    bulkDelBtn.innerHTML = `<span class="${dataIconClass}">🗑️</span> <span>Clear All</span>`;
    bulkDelBtn.addEventListener('click', () => {
        actions.onBulkDelete();
        closeMobileSidebar();
    });
    dataDiv.appendChild(bulkDelBtn);

    dataSection.appendChild(dataDiv);
    nav.appendChild(dataSection);

    // Bottom Section (Theme + Auth)
    const bottomSection = document.createElement('div');
    bottomSection.className = "mt-auto space-y-4 pt-4 border-t";

    const modeDiv = document.createElement('div');
    modeDiv.className = "rounded-lg border bg-muted/40 p-3 space-y-1";

    const modeLabel = document.createElement('div');
    modeLabel.className = "text-[11px] leading-tight text-muted-foreground uppercase font-bold";
    modeLabel.textContent = 'Sync Mode';

    const modeBadge = document.createElement('div');
    modeBadge.className = userEmail
        ? "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
        : "inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700";
    modeBadge.textContent = userEmail ? '☁️ Cloud Mode' : '💾 Local Mode';

    const modeHelp = document.createElement('p');
    modeHelp.className = "text-[11px] text-muted-foreground leading-snug";
    modeHelp.textContent = userEmail
        ? 'Changes sync to Supabase and stay available across devices.'
        : 'Data is stored only in this browser until you sign in.';

    modeDiv.appendChild(modeLabel);
    modeDiv.appendChild(modeBadge);
    modeDiv.appendChild(modeHelp);
    bottomSection.appendChild(modeDiv);

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
        if (/** @type {HTMLInputElement} */ (e.target).checked) {
            document.body.classList.add('dark');
            StorageManager.set(STORAGE_KEYS.THEME, 'dark');
        } else {
            document.body.classList.remove('dark');
            StorageManager.set(STORAGE_KEYS.THEME, 'light');
        }
    });

    const switchTrack = document.createElement('div');
    switchTrack.className = "peer h-5 w-9 rounded-full bg-muted transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring";

    themeSwitch.appendChild(themeInput);
    themeSwitch.appendChild(switchTrack);
    themeDiv.appendChild(themeSwitch);
    bottomSection.appendChild(themeDiv);

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
        logoutBtn.addEventListener('click', () => {
            actions.onLogout();
            closeMobileSidebar();
        });
        authDiv.appendChild(logoutBtn);

        bottomSection.appendChild(authDiv);
    }

    nav.appendChild(bottomSection);
    sidebar.appendChild(nav);

    // Interaction Logic
    const categoryBtns = nav.querySelectorAll('.category-btn');
    categoryBtns.forEach((btnEl) => {
        const btn = /** @type {HTMLButtonElement} */ (btnEl);
        const activeClass = "bg-accent text-accent-foreground font-semibold";

        btn.addEventListener('click', (e) => {
            categoryBtns.forEach(b => {
                b.classList.remove(...activeClass.split(' '));
                b.setAttribute('aria-checked', 'false');
                /** @type {HTMLButtonElement} */ (b).tabIndex = -1;
            });
            btn.classList.add(...activeClass.split(' '));
            btn.setAttribute('aria-checked', 'true');
            btn.tabIndex = 0;
            actions.onCategorySelect(btn.dataset.category);
            closeMobileSidebar();
        });

        // Keyboard navigation
        btn.addEventListener('keydown', (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextLi = btn.closest('li').nextElementSibling;
                const nextBtn = /** @type {HTMLButtonElement} */ (nextLi ? nextLi.querySelector('.category-btn') : categoryBtns[0]);
                nextBtn.focus();
                nextBtn.click();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevLi = btn.closest('li').previousElementSibling;
                const prevBtn = /** @type {HTMLButtonElement} */ (prevLi ? prevLi.querySelector('.category-btn') : categoryBtns[categoryBtns.length - 1]);
                prevBtn.focus();
                prevBtn.click();
            }
        });
    });

    mobileSidebarOverlay.addEventListener('click', closeMobileSidebar);
    window.addEventListener(MOBILE_SIDEBAR_TOGGLE_EVENT, toggleMobileSidebar);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
        }
    });
    window.addEventListener('resize', closeMobileSidebar);
    closeMobileSidebar();
};
