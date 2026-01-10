/**
 * Settings & Category Management Handler
 * Handles settings modal, category management with comprehensive error handling
 */

import { billStore } from '../store/BillStore.js';
import { paycheckManager } from '../utils/paycheckManager.js';
import { billActionHandlers } from './billActionHandlers.js';

/**
 * Show settings modal
 */
export function showSettingsModal(categoriesList) {
    try {
        const settings = JSON.parse(localStorage.getItem('paymentSettings') || '{}');

        if (!settings.startDate) {
            throw new Error('Payment settings not configured. Please run setup again.');
        }

        const modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>⚙️ Settings</h2>
                <p style="color: #666; margin-bottom: 20px;">Update your payment configuration</p>
                <form id="settingsForm">
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
                    <div class="category-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
                        ${categoriesList
                            .map(
                                cat => `
                            <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                                <span>${cat}</span>
                                <div>
                                    <button type="button" class="settings-btn edit-cat-btn" data-cat="${cat}" title="Edit" style="display: inline-flex; margin-right: 5px;">✏️</button>
                                    <button type="button" class="settings-btn delete-cat-btn" data-cat="${cat}" title="Delete" style="display: inline-flex; background-color: var(--danger-color);">🗑️</button>
                                </div>
                            </div>
                        `
                            )
                            .join('')}
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button type="submit" class="submit-btn" style="flex: 1;">Save Settings</button>
                        <button type="button" id="closeSettingsBtn" class="cancel-btn" style="flex: 1;">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Close button handler
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
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

        // Delete category handlers
        document.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const catToDelete = e.target.closest('button').dataset.cat;
                handleDeleteCategory(catToDelete, categoriesList, modal);
            });
        });

        // Edit category handlers
        document.querySelectorAll('.edit-cat-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                const oldName = e.target.closest('button').dataset.cat;
                handleEditCategory(oldName, categoriesList);
            });
        });

        // Settings form submit handler
        document.getElementById('settingsForm').addEventListener('submit', e => {
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

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <h3 style="color: var(--danger-color);">Delete Category</h3>
                <p style="margin: 15px 0;">
                    The category "<strong>${categoryName}</strong>" is used by <strong>${billCount}</strong> bill(s).
                    What would you like to do?
                </p>
                
                <form id="deleteCategoryForm">
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="radio" name="deleteAction" value="move" checked>
                            <span>Move bills to another category</span>
                        </label>
                        <select id="targetCategory" style="margin-left: 24px; margin-top: 5px; width: calc(100% - 24px);">
                            ${otherCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="radio" name="deleteAction" value="delete">
                            <span style="color: var(--danger-color);">Delete bills permanently</span>
                        </label>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="submit-btn" style="flex: 1;">Confirm</button>
                        <button type="button" id="cancelDeleteConflict" class="cancel-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('cancelDeleteConflict').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('deleteCategoryForm').addEventListener('submit', e => {
            e.preventDefault();
            const action = document.querySelector('input[name="deleteAction"]:checked').value;

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

        billActionHandlers.showSuccessNotification('Settings saved. Reloading application...');
        modal.remove();
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error saving settings:', error);
        billActionHandlers.showErrorNotification(error.message, 'Save Failed');
    }
}

export const settingsHandlers = {
    showSettingsModal,
    updateCategoryName,
    deleteCategoryClean
};
