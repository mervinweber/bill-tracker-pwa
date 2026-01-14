export function showSettingsModal(data, actions) {
    const { settings, categories, bills } = data;
    const {
        onSaveSettings,
        onAddCategory,
        onDeleteCategory,
        onEditCategory,
        initializeSidebar,
        renderBillGrid
    } = actions;

    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>⚙️ Settings</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Update your payment configuration</p>
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
                    ${categories.map(cat => `
                        <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                            <span>${cat}</span>
                            <div>
                                <button type="button" class="settings-btn edit-cat-btn" data-cat="${cat}" title="Edit" style="display: inline-flex; margin-right: 5px;">✏️</button>
                                <button type="button" class="settings-btn delete-cat-btn" data-cat="${cat}" title="Delete" style="display: inline-flex; background-color: var(--danger-color);">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button type="submit" class="submit-btn" style="flex: 1;">Save Settings</button>
                    <button type="button" id="closeSettingsBtn" class="cancel-btn" style="flex: 1;">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    document.getElementById('closeSettingsBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Add New Category Logic
    document.getElementById('addNewCategoryBtn').addEventListener('click', () => {
        const input = document.getElementById('newCategoryInput');
        const name = input.value.trim();
        if (name) {
            if (onAddCategory(name)) {
                closeModal();
                showSettingsModal(data, actions); // Refresh
            }
        }
    });

    // Delete Category Logic
    modal.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catToDelete = e.target.closest('button').dataset.cat;
            handleDeleteCategoryFlow(catToDelete, modal, { bills, categories, actions });
        });
    });

    // Edit Category Logic
    modal.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const oldName = e.target.closest('button').dataset.cat;
            const newName = prompt('Rename category:', oldName);
            if (newName && newName.trim() !== '' && newName !== oldName) {
                if (onEditCategory(oldName, newName)) {
                    closeModal();
                    showSettingsModal({ ...data, categories: categories.map(c => c === oldName ? newName : c) }, actions);
                }
            }
        });
    });

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newSettings = {
            startDate: document.getElementById('settingsStartDate').value,
            frequency: document.getElementById('settingsFrequency').value,
            payPeriodsToShow: parseInt(document.getElementById('settingsWeeks').value)
        };
        onSaveSettings(newSettings);
        closeModal();
    });
}

function handleDeleteCategoryFlow(categoryName, settingsModal, { bills, categories, actions }) {
    const affectedBills = bills.filter(b => b.category === categoryName);

    if (affectedBills.length === 0) {
        if (confirm(`Are you sure you want to delete "${categoryName}"?`)) {
            actions.onDeleteCategory(categoryName);
            settingsModal.remove();
            showSettingsModal({ ...actions.getData(), bills, categories: categories.filter(c => c !== categoryName) }, actions);
        }
    } else {
        showDeleteCategoryConflictModal(categoryName, affectedBills.length, settingsModal, { categories, actions });
    }
}

function showDeleteCategoryConflictModal(categoryName, count, settingsModal, { categories, actions }) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.zIndex = '1001';

    const otherCategories = categories.filter(c => c !== categoryName);

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3 style="color: var(--danger-color);">Delete Category</h3>
            <p style="margin: 15px 0;">
                The category "<strong>${categoryName}</strong>" is used by <strong>${count}</strong> bill(s).
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

    document.getElementById('cancelDeleteConflict').onclick = () => modal.remove();

    document.getElementById('deleteCategoryForm').onsubmit = (e) => {
        e.preventDefault();
        const action = document.querySelector('input[name="deleteAction"]:checked').value;
        const targetCat = document.getElementById('targetCategory') ? document.getElementById('targetCategory').value : null;

        actions.onDeleteCategoryConflict(categoryName, action, targetCat);

        modal.remove();
        settingsModal.remove();
        showSettingsModal(actions.getData(), actions);
    };
}
