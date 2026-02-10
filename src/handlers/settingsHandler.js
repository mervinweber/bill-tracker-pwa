/**
 * Settings & Category Management Handler
 * Handles settings modal, category management with comprehensive error handling
 */

import { billStore } from '../store/BillStore.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { billActionHandlers } from './billActionHandlers.js';
import { safeJSONParse } from '../utils/validation.js';
import { syncPaymentSettings, getUser } from '../services/supabase.js';

/**
 * Show settings modal
 */
export function showSettingsModal(categoriesList) {
    try {
        console.log('📋 Settings modal requested. Categories:', categoriesList);
        
        const settings = safeJSONParse(localStorage.getItem('paymentSettings'), {});
        console.log('💾 Payment settings loaded:', settings);

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
        console.log('✅ Settings modal created and appended to DOM');

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

        // Settings form submit handler
        form.addEventListener('submit', e => {
            handleSettingsSave(e, modal);
        });
    } catch (error) {
        console.error('Error showing settings modal:', error);
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
        localStorage.setItem('customCategories', JSON.stringify(categoriesList));
        localStorage.setItem('selectedCategory', name);

        billActionHandlers.showSuccessNotification(`Category "${name}" added successfully`);

        // Re-render settings modal
        settingsModal.remove();
        showSettingsModal(categoriesList);
    } catch (error) {
        console.error('Error adding category:', error);
        billActionHandlers.showErrorNotification(error.message, 'Add Category Failed');
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
        console.error('Error editing category:', error);
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
        console.error('Error deleting category:', error);
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
            localStorage.setItem('customCategories', JSON.stringify(categoriesList));

            // Reset selection if needed
            if (localStorage.getItem('selectedCategory') === categoryName) {
                localStorage.setItem('selectedCategory', categoriesList[0] || 'All');
            }

            billActionHandlers.showSuccessNotification(`Category "${categoryName}" deleted`);
            settingsModal.remove();
            showSettingsModal(categoriesList);
        }
    } catch (error) {
        console.error('Error deleting category:', error);
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
            localStorage.setItem('customCategories', JSON.stringify(categoriesList));

            // Reset selection
            if (localStorage.getItem('selectedCategory') === categoryName) {
                localStorage.setItem('selectedCategory', categoriesList[0] || 'All');
            }

            billActionHandlers.showSuccessNotification(`Category "${categoryName}" deleted`);
            modal.remove();
            settingsModal.remove();
            showSettingsModal(categoriesList);
        });
    } catch (error) {
        console.error('Error showing delete conflict modal:', error);
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
            localStorage.setItem('customCategories', JSON.stringify(categoriesList));
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
        console.error('Error updating category name:', error);
        billActionHandlers.showErrorNotification(error.message, 'Update Failed');
        return false;
    }
}

/**
 * Handle settings form submission
 */
function handleSettingsSave(e, modal) {
    e.preventDefault();

    try {
        const startDate = document.getElementById('settingsStartDate').value;
        const frequency = document.getElementById('settingsFrequency').value;
        const weeks = parseInt(document.getElementById('settingsWeeks').value);

        if (!startDate) {
            throw new Error('Start date is required');
        }

        const newSettings = {
            startDate,
            frequency,
            payPeriodsToShow: weeks
        };

        // Update paycheck manager
        paycheckManager.updateSettings(newSettings);

        // Save to localStorage
        localStorage.setItem('paymentSettings', JSON.stringify(newSettings));

        // Sync to cloud if user is logged in
        (async () => {
            const user = await getUser();
            if (user) {
                try {
                    const { error } = await syncPaymentSettings(newSettings);
                    if (error) {
                        console.error('Failed to sync payment settings to cloud:', error);
                        billActionHandlers.showErrorNotification('Settings saved locally but cloud sync failed', 'Sync Warning');
                    } else {
                        console.log('✅ Payment settings synced to cloud');
                    }
                } catch (syncErr) {
                    console.error('Error syncing payment settings:', syncErr);
                    billActionHandlers.showErrorNotification('Settings saved locally but cloud sync failed', 'Sync Warning');
                }
            }
        })();

        billActionHandlers.showSuccessNotification('Settings saved. Reloading application...');
        modal.remove();
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error saving settings:', error);
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
        
        localStorage.setItem('customCategories', JSON.stringify(cleanedCategories));
        
        billActionHandlers.showSuccessNotification(
            `Removed ${unusedCategories.length} unused categor${unusedCategories.length === 1 ? 'y' : 'ies'}`
        );
        
        // Refresh settings modal to show updated list
        settingsModal.remove();
        showSettingsModal(cleanedCategories);
    } catch (error) {
        console.error('Error cleaning up categories:', error);
        billActionHandlers.showErrorNotification(error.message, 'Cleanup Failed');
    }
}

export const settingsHandlers = {
    showSettingsModal,
    updateCategoryName,
    deleteCategoryClean
};
