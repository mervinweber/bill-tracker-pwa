/**
 * Settings & Category Management Handler
 * Handles settings modal, category management with comprehensive error handling
 */

import { billStore } from '../store/BillStore.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { billActionHandlers } from './billActionHandlers.js';
import { safeJSONParse, validatePaymentSettings } from '../utils/validation.js';
import { syncPaymentSettings, getUser, createHousehold, joinHousehold, getHouseholdStatus } from '../services/supabase.js';
import StorageManager from '../utils/StorageManager.js';
import logger from '../utils/logger.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import {
    getNotificationSettings,
    getReminderHistory,
    isNotificationSupported,
    requestNotificationPermission,
    sendTestReminder
} from '../utils/notifications.js';
import { hasPaymentScheduleChanged } from '../utils/settingsHelpers.js';
import { recordAuditEvent } from '../utils/auditTracker.js';

/**
 * Show settings modal
 */
export function showSettingsModal(categoriesList) {
    try {
        logger.info('Settings modal requested', { categories: categoriesList });
        
        const settings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, {});
        const notificationSettings = getNotificationSettings();
        logger.info('Payment settings loaded', { settings });

        if (!settings.startDate) {
            throw new Error('Payment settings not configured. Please run setup again.');
        }

        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const title = document.createElement('h2');
        title.textContent = '⚙️ Settings';

        const subtitle = document.createElement('p');
        subtitle.style.color = '#666';
        subtitle.style.marginBottom = '20px';
        subtitle.textContent = 'Update your payment configuration';

        const form = document.createElement('form');
        form.id = 'settingsForm';

        // Static Form Fields
        form.innerHTML = `
            <div class="form-group">
                <label><strong>First Paycheck Date:</strong></label>
                <input type="date" id="settingsStartDate" value="${settings.startDate}" required>
            </div>
            <div class="form-group">
                <label><strong>Payment Frequency:</strong></label>
                <select id="settingsFrequency" required>
                    <option value="weekly" ${settings.frequency === 'weekly' ? 'selected' : ''}>Weekly (every 7 days)</option>
                    <option value="bi-weekly" ${settings.frequency === 'bi-weekly' ? 'selected' : ''}>Bi-weekly (every 14 days)</option>
                    <option value="monthly" ${settings.frequency === 'monthly' ? 'selected' : ''}>Monthly (every 30 days)</option>
                </select>
            </div>
            <div class="form-group">
                <label><strong>Number of Pay Periods to Show:</strong></label>
                <select id="settingsWeeks" required>
                    <option value="3" ${settings.payPeriodsToShow === 3 ? 'selected' : ''}>3 Pay Periods</option>
                    <option value="4" ${settings.payPeriodsToShow === 4 ? 'selected' : ''}>4 Pay Periods</option>
                    <option value="6" ${settings.payPeriodsToShow === 6 ? 'selected' : ''}>6 Pay Periods</option>
                    <option value="8" ${settings.payPeriodsToShow === 8 ? 'selected' : ''}>8 Pay Periods</option>
                    <option value="12" ${settings.payPeriodsToShow === 12 ? 'selected' : ''}>12 Pay Periods</option>
                </select>
            </div>
            <div class="form-group">
                <label><strong>Paycheck Amount (optional):</strong></label>
                <input type="number" id="settingsAmount" min="0" step="0.01" value="${typeof settings.amount === 'number' ? settings.amount : ''}" placeholder="e.g. 2500">
                <small style="display:block; margin-top: 6px; color: #666;">Used for upcoming bill coverage calculations.</small>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
            <h3>Reminders</h3>
            <div class="form-group">
                <label style="display: inline-flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="settingsNotificationsEnabled" ${notificationSettings.enabled ? 'checked' : ''} ${isNotificationSupported() ? '' : 'disabled'}>
                    <strong>Enable bill due reminders</strong>
                </label>
                <div style="margin-top: 6px; color: #666; font-size: 13px;">
                    ${isNotificationSupported()
                        ? 'Shows browser reminders when unpaid bills are due soon.'
                        : 'This browser does not support notifications.'}
                </div>
            </div>
            <div class="form-group">
                <label><strong>Remind me this many days before due date:</strong></label>
                <select id="settingsReminderDays" ${isNotificationSupported() ? '' : 'disabled'}>
                    <option value="0" ${notificationSettings.daysBefore === 0 ? 'selected' : ''}>Due date only</option>
                    <option value="1" ${notificationSettings.daysBefore === 1 ? 'selected' : ''}>1 day before</option>
                    <option value="2" ${notificationSettings.daysBefore === 2 ? 'selected' : ''}>2 days before</option>
                    <option value="3" ${notificationSettings.daysBefore === 3 ? 'selected' : ''}>3 days before</option>
                    <option value="7" ${notificationSettings.daysBefore === 7 ? 'selected' : ''}>7 days before</option>
                </select>
            </div>
            <div class="form-group" style="display: flex; gap: 10px; align-items: center;">
                <button type="button" id="sendTestReminderBtn" class="view-btn" ${isNotificationSupported() ? '' : 'disabled'}>
                    🔔 Send Test Reminder
                </button>
                <span style="color: #666; font-size: 13px;">Use this to verify browser notifications are working.</span>
            </div>
            <div class="form-group">
                <label><strong>Reminder History (most recent first):</strong></label>
                <div id="reminderHistoryList" style="max-height: 140px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 8px;"></div>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
            <h3>Household Sharing</h3>
            <div id="householdSection" class="form-group" style="background: rgba(var(--primary-rgb), 0.05); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
                    Share your bill data with a partner. Both users will see and update the same bill list in real-time.
                </p>
                <div id="householdStatusContainer" style="display: flex; flex-direction: column; gap: 12px;">
                    <button type="button" id="createHouseholdBtn" class="view-btn" style="background-color: var(--primary-color); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        🏠 Create Shared Household
                    </button>
                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                        <input type="text" id="joinHouseholdInput" placeholder="Paste Household ID here" style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                        <button type="button" id="joinHouseholdBtn" class="view-btn" style="padding: 8px 15px; background: white; border: 1px solid var(--border-color); border-radius: 4px;">Join</button>
                    </div>
                </div>
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
            <h3>Manage Categories</h3>
            <div class="form-group">
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="newCategoryInput" placeholder="New Category Name" style="flex: 1;">
                    <button type="button" id="addNewCategoryBtn" class="view-btn">Add</button>
                </div>
            </div>
        `;

        // Category List Container
        const catListContainer = document.createElement('div');
        catListContainer.className = 'category-list';
        catListContainer.style.maxHeight = '200px';
        catListContainer.style.overflowY = 'auto';
        catListContainer.style.border = '1px solid var(--border-color)';
        catListContainer.style.borderRadius = '6px';
        catListContainer.style.padding = '10px';

        categoriesList.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '8px 0';
            item.style.borderBottom = '1px solid var(--border-color)';

            const span = document.createElement('span');
            span.textContent = cat;
            item.appendChild(span);

            const btnContainer = document.createElement('div');

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'settings-btn edit-cat-btn';
            editBtn.dataset.cat = cat;
            editBtn.title = 'Edit';
            editBtn.style.display = 'inline-flex';
            editBtn.style.marginRight = '5px';
            editBtn.textContent = '✏️';
            btnContainer.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'settings-btn delete-cat-btn';
            deleteBtn.dataset.cat = cat;
            deleteBtn.title = 'Delete';
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.style.backgroundColor = 'var(--danger-color)';
            deleteBtn.textContent = '🗑️';
            btnContainer.appendChild(deleteBtn);

            item.appendChild(btnContainer);
            catListContainer.appendChild(item);
        });

        form.appendChild(catListContainer);

        // Buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.style.marginTop = '20px';
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '10px';
        buttonGroup.style.flexWrap = 'wrap';

        const cleanupBtn = document.createElement('button');
        cleanupBtn.type = 'button';
        cleanupBtn.id = 'cleanupCategoriesBtn';
        cleanupBtn.className = 'view-btn';
        cleanupBtn.style.flex = '1';
        cleanupBtn.style.minWidth = '150px';
        cleanupBtn.style.backgroundColor = '#9b59b6';
        cleanupBtn.textContent = '🧹 Clean Up Unused';
        cleanupBtn.title = 'Remove all categories that have no bills';
        buttonGroup.appendChild(cleanupBtn);

        const saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'submit-btn';
        saveBtn.style.flex = '1';
        saveBtn.style.minWidth = '100px';
        saveBtn.textContent = 'Save Settings';
        buttonGroup.appendChild(saveBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'closeSettingsBtn';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.style.flex = '1';
        cancelBtn.style.minWidth = '100px';
        cancelBtn.textContent = 'Cancel';
        buttonGroup.appendChild(cancelBtn);

        form.appendChild(buttonGroup);

        modalContent.appendChild(title);
        modalContent.appendChild(subtitle);
        modalContent.appendChild(form);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);
        logger.info('Settings modal created and appended to DOM');

        renderReminderHistoryList();

        // Close button handler
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Modal backdrop click handler
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Add new category handler
        document.getElementById('addNewCategoryBtn').addEventListener('click', () => {
            handleAddNewCategory(categoriesList, modal);
        });

        const sendTestReminderBtn = document.getElementById('sendTestReminderBtn');
        if (sendTestReminderBtn) {
            sendTestReminderBtn.addEventListener('click', async () => {
                await handleSendTestReminder();
            });
        }

        // Clean up unused categories handler
        document.getElementById('cleanupCategoriesBtn').addEventListener('click', () => {
            handleCleanupUnusedCategories(categoriesList, modal);
        });

        // Delete category handlers
        // Need to attach to the dynamically created buttons specifically or delegate
        // Since we created them, we can attach directly in the loop, or query select from form
        // Querying from form works fine.
        form.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const catToDelete = e.target.closest('button').dataset.cat;
                handleDeleteCategory(catToDelete, categoriesList, modal);
            });
        });

        form.querySelectorAll('.edit-cat-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const oldName = e.target.closest('button').dataset.cat;
                handleEditCategory(oldName, categoriesList);
            });
        });

        // Initialize Household status
        updateHouseholdUI();

        // Household handlers
        document.getElementById('createHouseholdBtn').addEventListener('click', async () => {
            const confirmed = confirm('Creating a shared household will make your current bills available to anyone who joins with your Household ID. Continue?');
            if (confirmed) {
                const { householdId, error } = await createHousehold();
                if (error) {
                    billActionHandlers.showErrorNotification(error.message, 'Create Failed');
                } else {
                    billActionHandlers.showSuccessNotification('Household created!');
                    updateHouseholdUI();
                }
            }
        });

        document.getElementById('joinHouseholdBtn').addEventListener('click', async () => {
            const householdId = document.getElementById('joinHouseholdInput').value.trim();
            if (!householdId) {
                billActionHandlers.showErrorNotification('Please enter a Household ID', 'Invalid Input');
                return;
            }

            const confirmed = confirm('Joining a household will REPLACE your local bills with the shared household bills. This cannot be undone. Continue?');
            if (confirmed) {
                const { error } = await joinHousehold(householdId);
                if (error) {
                    billActionHandlers.showErrorNotification(error.message, 'Join Failed');
                } else {
                    billActionHandlers.showSuccessNotification('Successfully joined household! Reloading...');
                    setTimeout(() => window.location.reload(), 1500);
                }
            }
        });
    } catch (error) {
        logger.error('Error showing settings modal', error);
        billActionHandlers.showErrorNotification(error.message, 'Settings Error');
    }
}

/**
 * Handle adding new category
 */
function handleAddNewCategory(categoriesList, settingsModal) {
    try {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();

        if (!name) {
            billActionHandlers.showErrorNotification('Please enter a category name', 'Invalid Input');
            return;
        }

        if (name.length > 50) {
            billActionHandlers.showErrorNotification('Category name must be 50 characters or less', 'Invalid Input');
            return;
        }

        if (categoriesList.includes(name)) {
            billActionHandlers.showErrorNotification('This category already exists!', 'Duplicate Category');
            return;
        }

        categoriesList.push(name);
        StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, categoriesList);
        StorageManager.set(STORAGE_KEYS.SELECTED_CATEGORY, name);

        billActionHandlers.showSuccessNotification(`Category "${name}" added successfully`);

        // Re-render settings modal
        settingsModal.remove();
        showSettingsModal(categoriesList);
    } catch (error) {
        logger.error('Error adding category', error);
        billActionHandlers.showErrorNotification(error.message, 'Add Category Failed');
    }
}

function renderReminderHistoryList() {
    const container = document.getElementById('reminderHistoryList');
    if (!container) {
        return;
    }

    const history = getReminderHistory(billStore.getAll()).slice(0, 25);
    container.innerHTML = '';

    if (history.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = '#666';
        empty.style.fontSize = '13px';
        empty.textContent = 'No reminder notifications have been sent yet.';
        container.appendChild(empty);
        return;
    }

    history.forEach(entry => {
        const row = document.createElement('div');
        row.style.padding = '6px 0';
        row.style.borderBottom = '1px solid var(--border-color)';

        const sentDate = new Date(entry.sentAt);
        const sentText = Number.isNaN(sentDate.getTime())
            ? 'Unknown time'
            : sentDate.toLocaleString();

        row.textContent = `${entry.billName} (due ${entry.dueDate}) — sent ${sentText}`;
        container.appendChild(row);
    });
}

async function handleSendTestReminder() {
    try {
        if (!isNotificationSupported()) {
            billActionHandlers.showErrorNotification('This browser does not support notifications.', 'Unsupported');
            return;
        }

        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            billActionHandlers.showErrorNotification('Notification permission is required for test reminders.', 'Permission Required');
            return;
        }

        const result = sendTestReminder();
        if (result.sent) {
            billActionHandlers.showSuccessNotification('Test reminder sent successfully.');
        } else {
            billActionHandlers.showErrorNotification('Could not send test reminder.', 'Reminder Error');
        }
    } catch (error) {
        logger.error('Error sending test reminder', error);
        billActionHandlers.showErrorNotification(error.message, 'Reminder Error');
    }
}

/**
 * Handle editing category name
 */
function handleEditCategory(oldName, categoriesList) {
    try {
        const newName = prompt('Rename category:', oldName);

        if (!newName || newName.trim() === '') {
            return;
        }

        if (newName === oldName) {
            return;
        }

        if (newName.length > 50) {
            billActionHandlers.showErrorNotification('Category name must be 50 characters or less', 'Invalid Input');
            return;
        }

        if (categoriesList.includes(newName)) {
            billActionHandlers.showErrorNotification('A category with that name already exists.', 'Duplicate Category');
            return;
        }

        updateCategoryName(oldName, newName, categoriesList);
    } catch (error) {
        logger.error('Error editing category', error);
        billActionHandlers.showErrorNotification(error.message, 'Edit Category Failed');
    }
}

/**
 * Handle deleting category
 */
function handleDeleteCategory(categoryName, categoriesList, settingsModal) {
    try {
        const affectedBills = billStore.getAll().filter(b => b.category === categoryName);

        if (affectedBills.length === 0) {
            // Safe to delete immediately
            if (confirm(`Are you sure you want to delete "${categoryName}"?`)) {
                deleteCategoryClean(categoryName, categoriesList, settingsModal);
            }
        } else {
            // Show conflict resolution modal
            showDeleteCategoryConflictModal(
                categoryName,
                affectedBills.length,
                categoriesList,
                settingsModal
            );
        }
    } catch (error) {
        logger.error('Error deleting category', error);
        billActionHandlers.showErrorNotification(error.message, 'Delete Category Failed');
    }
}

/**
 * Delete category when no bills are affected
 */
function deleteCategoryClean(categoryName, categoriesList, settingsModal) {
    try {
        const index = categoriesList.indexOf(categoryName);
        if (index > -1) {
            categoriesList.splice(index, 1);
            StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, categoriesList);

            // Reset selection if needed
            if (StorageManager.get(STORAGE_KEYS.SELECTED_CATEGORY) === categoryName) {
                StorageManager.set(STORAGE_KEYS.SELECTED_CATEGORY, categoriesList[0] || 'All');
            }

            billActionHandlers.showSuccessNotification(`Category "${categoryName}" deleted`);
            settingsModal.remove();
            showSettingsModal(categoriesList);
        }
    } catch (error) {
        logger.error('Error deleting category', error);
        billActionHandlers.showErrorNotification(error.message, 'Delete Failed');
    }
}

/**
 * Show category delete conflict modal
 */
function showDeleteCategoryConflictModal(categoryName, billCount, categoriesList, settingsModal) {
    try {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.zIndex = '1001';

        const otherCategories = categoriesList.filter(c => c !== categoryName);

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '400px';

        const title = document.createElement('h3');
        title.style.color = 'var(--danger-color)';
        title.textContent = 'Delete Category';
        modalContent.appendChild(title);

        const p = document.createElement('p');
        p.style.margin = '15px 0';
        p.appendChild(document.createTextNode('The category "'));
        const strongCat = document.createElement('strong');
        strongCat.textContent = categoryName;
        p.appendChild(strongCat);
        p.appendChild(document.createTextNode(`" is used by `));
        const strongCount = document.createElement('strong');
        strongCount.textContent = billCount;
        p.appendChild(strongCount);
        p.appendChild(document.createTextNode(' bill(s). What would you like to do?'));
        modalContent.appendChild(p);

        const form = document.createElement('form');
        form.id = 'deleteCategoryForm';

        // Move Option
        const moveGroup = document.createElement('div');
        moveGroup.className = 'form-group';

        const moveLabel = document.createElement('label');
        moveLabel.style.display = 'flex';
        moveLabel.style.alignItems = 'center';
        moveLabel.style.gap = '10px';
        moveLabel.style.cursor = 'pointer';

        const moveRadio = document.createElement('input');
        moveRadio.type = 'radio';
        moveRadio.name = 'deleteAction';
        moveRadio.value = 'move';
        moveRadio.checked = true;
        moveLabel.appendChild(moveRadio);
        moveLabel.appendChild(document.createTextNode('Move bills to another category'));
        moveGroup.appendChild(moveLabel);

        const select = document.createElement('select');
        select.id = 'targetCategory';
        select.style.marginLeft = '24px';
        select.style.marginTop = '5px';
        select.style.width = 'calc(100% - 24px)';
        otherCategories.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            select.appendChild(option);
        });
        moveGroup.appendChild(select);
        form.appendChild(moveGroup);

        // Delete Option
        const deleteGroup = document.createElement('div');
        deleteGroup.className = 'form-group';

        const deleteLabel = document.createElement('label');
        deleteLabel.style.display = 'flex';
        deleteLabel.style.alignItems = 'center';
        deleteLabel.style.gap = '10px';
        deleteLabel.style.cursor = 'pointer';

        const deleteRadio = document.createElement('input');
        deleteRadio.type = 'radio';
        deleteRadio.name = 'deleteAction';
        deleteRadio.value = 'delete';
        deleteLabel.appendChild(deleteRadio);

        const deleteSpan = document.createElement('span');
        deleteSpan.style.color = 'var(--danger-color)';
        deleteSpan.textContent = 'Delete bills permanently';
        deleteLabel.appendChild(deleteSpan);

        deleteGroup.appendChild(deleteLabel);
        form.appendChild(deleteGroup);

        // Buttons
        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '10px';
        btnGroup.style.marginTop = '20px';

        const confirmBtn = document.createElement('button');
        confirmBtn.type = 'submit';
        confirmBtn.className = 'submit-btn';
        confirmBtn.style.flex = '1';
        confirmBtn.textContent = 'Confirm';
        btnGroup.appendChild(confirmBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancelDeleteConflict';
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = 'Cancel';
        btnGroup.appendChild(cancelBtn);

        form.appendChild(btnGroup);
        modalContent.appendChild(form);
        modal.appendChild(modalContent);

        document.body.appendChild(modal);

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            const action = form.querySelector('input[name="deleteAction"]:checked').value;

            if (action === 'move') {
                const targetCat = document.getElementById('targetCategory').value;
                const currentBills = billStore.getAll();
                currentBills.forEach(bill => {
                    if (bill.category === categoryName) {
                        bill.category = targetCat;
                        billStore.update(bill);
                    }
                });
            } else if (action === 'delete') {
                const currentBills = billStore.getAll();
                currentBills.forEach(bill => {
                    if (bill.category === categoryName) {
                        billStore.delete(bill.id);
                    }
                });
            }

            // Delete category
            const index = categoriesList.indexOf(categoryName);
            if (index > -1) {
                categoriesList.splice(index, 1);
            }
            StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, categoriesList);

            // Reset selection
            if (StorageManager.get(STORAGE_KEYS.SELECTED_CATEGORY) === categoryName) {
                StorageManager.set(STORAGE_KEYS.SELECTED_CATEGORY, categoriesList[0] || 'All');
            }

            billActionHandlers.showSuccessNotification(`Category "${categoryName}" deleted`);
            modal.remove();
            settingsModal.remove();
            showSettingsModal(categoriesList);
        });
    } catch (error) {
        logger.error('Error showing delete conflict modal', error);
        billActionHandlers.showErrorNotification(error.message, 'Error');
    }
}

/**
 * Update category name across all bills
 */
function updateCategoryName(oldName, newName, categoriesList) {
    try {
        // Update category list
        const index = categoriesList.indexOf(oldName);
        if (index !== -1) {
            categoriesList[index] = newName;
            StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, categoriesList);
        }

        // Update all bills with this category
        const currentBills = billStore.getAll();
        currentBills.forEach(bill => {
            if (bill.category === oldName) {
                bill.category = newName;
                billStore.update(bill);
            }
        });

        billActionHandlers.showSuccessNotification(`Category renamed to "${newName}"`);
        return true;
    } catch (error) {
        logger.error('Error updating category name', error);
        billActionHandlers.showErrorNotification(error.message, 'Update Failed');
        return false;
    }
}

/**
 * Handle settings form submission
 */
async function handleSettingsSave(e, modal) {
    e.preventDefault();

    try {
        const existingSettings = StorageManager.get(STORAGE_KEYS.PAYMENT_SETTINGS, {});
        const startDate = document.getElementById('settingsStartDate').value;
        const frequency = document.getElementById('settingsFrequency').value;
        const weeks = parseInt(document.getElementById('settingsWeeks').value);
        const amountInput = document.getElementById('settingsAmount').value;
        const amount = amountInput !== '' ? parseFloat(amountInput) : null;
        const notificationsEnabledInput = document.getElementById('settingsNotificationsEnabled');
        const reminderDaysInput = document.getElementById('settingsReminderDays');

        let notificationsEnabled = !!notificationsEnabledInput?.checked;
        const reminderDays = parseInt(reminderDaysInput?.value ?? '1', 10);

        if (!startDate) {
            throw new Error('Start date is required');
        }

        if (amountInput !== '' && (!Number.isFinite(amount) || amount < 0)) {
            throw new Error('Paycheck amount must be 0 or greater');
        }

        const newSettings = {
            startDate,
            frequency,
            payPeriodsToShow: weeks,
            amount
        };

        const paymentSettingsChanged = hasPaymentScheduleChanged(existingSettings, newSettings);

        // Validate payment settings only when schedule fields are changed.
        // This allows category/reminder-only saves even if legacy startDate is now in the past.
        if (paymentSettingsChanged) {
            const validation = validatePaymentSettings(newSettings);
            if (!validation.isValid) {
                const errorMessage = validation.errors.join('; ');
                throw new Error(errorMessage);
            }

            logger.info('Payment settings validated', { settings: newSettings });
        } else {
            logger.info('Payment settings unchanged; skipping schedule validation');
        }

        if (notificationsEnabled && isNotificationSupported()) {
            const permission = await requestNotificationPermission();
            if (permission !== 'granted') {
                notificationsEnabled = false;
                billActionHandlers.showErrorNotification(
                    'Notification permission was not granted. Reminders were saved as disabled.',
                    'Notifications Disabled'
                );
            }
        }

        StorageManager.set(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
            enabled: notificationsEnabled,
            daysBefore: Number.isNaN(reminderDays) ? 1 : reminderDays
        });

        // Update paycheck manager
        paycheckManager.updateSettings(newSettings);

        // Save to localStorage
        StorageManager.set(STORAGE_KEYS.PAYMENT_SETTINGS, newSettings);

        recordAuditEvent('settings.saved', {
            entityType: 'settings',
            summary: 'Payment settings updated',
            metadata: {
                paymentSettingsChanged,
                frequency: newSettings.frequency,
                payPeriodsToShow: newSettings.payPeriodsToShow,
                amount: newSettings.amount,
                notificationsEnabled,
                reminderDays: Number.isNaN(reminderDays) ? 1 : reminderDays
            }
        });

        // Sync to cloud if user is logged in
        (async () => {
            const user = await getUser();
            if (user) {
                try {
                    const { error } = await syncPaymentSettings(newSettings);
                    if (error) {
                        logger.error('Failed to sync payment settings to cloud', error);
                        billActionHandlers.showErrorNotification('Settings saved locally but cloud sync failed', 'Sync Warning');
                    } else {
                        logger.info('Payment settings synced to cloud');
                    }
                } catch (syncErr) {
                    logger.error('Error syncing payment settings', syncErr);
                    billActionHandlers.showErrorNotification('Settings saved locally but cloud sync failed', 'Sync Warning');
                }
            }
        })();

        billActionHandlers.showSuccessNotification('Settings saved. Reloading application...');
        modal.remove();
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        logger.error('Error saving settings', error);
        billActionHandlers.showErrorNotification(error.message, 'Save Failed');
    }
}

/**
 * Handle cleaning up unused categories
 * Finds all categories with no associated bills and removes them
 */
function handleCleanupUnusedCategories(categoriesList, settingsModal) {
    try {
        const allBills = billStore.getAll();
        const usedCategories = new Set(allBills.map(b => b.category).filter(c => c && c.trim() !== ''));
        
        const unusedCategories = categoriesList.filter(cat => !usedCategories.has(cat));
        
        if (unusedCategories.length === 0) {
            billActionHandlers.showErrorNotification(
                'All categories are in use. Nothing to clean up!',
                'Clean Up Complete'
            );
            return;
        }
        
        const confirmed = confirm(
            `Found ${unusedCategories.length} unused categories:\n\n${unusedCategories.join('\n')}\n\nRemove them?`
        );
        
        if (!confirmed) {
            return;
        }
        
        // Remove unused categories
        const cleanedCategories = categoriesList.filter(cat => usedCategories.has(cat));
        
        StorageManager.set(STORAGE_KEYS.CUSTOM_CATEGORIES, cleanedCategories);
        
        billActionHandlers.showSuccessNotification(
            `Removed ${unusedCategories.length} unused categor${unusedCategories.length === 1 ? 'y' : 'ies'}`
        );
        
        // Refresh settings modal to show updated list
        settingsModal.remove();
        showSettingsModal(cleanedCategories);
    } catch (error) {
        logger.error('Error cleaning up categories', error);
        billActionHandlers.showErrorNotification(error.message, 'Cleanup Failed');
    }
}

export const settingsHandlers = {
    showSettingsModal,
    updateCategoryName,
    deleteCategoryClean
};

/**
 * Update the household UI section based on current status
 */
async function updateHouseholdUI() {
    const householdId = await getHouseholdStatus();
    const container = document.getElementById('householdStatusContainer');
    if (!container) return;

    if (householdId) {
        container.innerHTML = `
            <div style="background: rgba(var(--primary-rgb), 0.1); padding: 12px; border-radius: 6px; border: 1px solid var(--primary-color);">
                <p style="margin: 0; font-weight: 600; color: var(--primary-color);">✅ Member of Shared Household</p>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Household ID:</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <code style="background: #eee; padding: 4px 8px; border-radius: 4px; font-size: 13px; flex: 1; word-break: break-all;">${householdId}</code>
                        <button type="button" class="view-btn" style="padding: 4px 8px; font-size: 11px;" onclick="navigator.clipboard.writeText('${householdId}').then(() => alert('Copied!'))">Copy</button>
                    </div>
                </div>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                    Share this ID with your partner so they can join and sync data.
                </p>
            </div>
        `;
    }
}
