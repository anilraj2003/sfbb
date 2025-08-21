// Application State
let appState = {
    currentSection: 'introduction',
    formData: {},
    completedSections: new Set(),
    lastSaved: null
};

// Auto-save interval (in milliseconds)
const AUTOSAVE_INTERVAL = 2000;
let autosaveTimeout = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSavedData();
    updateUI();
});

function initializeApp() {
    // Set initial dates
    const today = new Date().toISOString().split('T')[0];
    const completionDateField = document.getElementById('completionDate');
    if (completionDateField) {
        completionDateField.value = today;
    }
    
    // Initialize form data structure
    appState.formData = {
        businessInfo: {},
        crossContamination: {},
        cleaning: {},
        chilling: {},
        cooking: {},
        management: {},
        diary: {}
    };
    
    // Set up initial UI state
    showSection('introduction');
}

function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionName = this.dataset.section;
            if (sectionName) {
                showSection(sectionName);
                updateActiveNavigation(this);
            }
        });
    });
    
    // Tab buttons within sections
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.dataset.tab;
            const tabsContainer = this.closest('.methods-tabs');
            
            if (tabId && tabsContainer) {
                switchToTab(tabsContainer, tabId);
            }
        });
    });
    
    // Form inputs for auto-save
    document.addEventListener('input', handleFormInput);
    document.addEventListener('change', handleFormInput);
    
    // Action buttons
    const printBtn = document.getElementById('printBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (printBtn) {
        printBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handlePrint();
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleManualSave();
        });
    }
    
    // Add supplier button
    const addSupplierBtn = document.getElementById('addSupplierBtn');
    if (addSupplierBtn) {
        addSupplierBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addSupplierEntry();
        });
    }
    
    // Prevent form submission
    document.addEventListener('submit', function(e) {
        e.preventDefault();
    });
}

function showSection(sectionName) {
    console.log('Switching to section:', sectionName);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        appState.currentSection = sectionName;
        
        // Reset to first tab in sections with tabs
        const methodsTabs = targetSection.querySelector('.methods-tabs');
        if (methodsTabs) {
            const firstTab = methodsTabs.querySelector('.tab-btn');
            if (firstTab) {
                const firstTabId = firstTab.dataset.tab;
                switchToTab(methodsTabs, firstTabId);
            }
        }
        
        console.log('Successfully switched to section:', sectionName);
    } else {
        console.error('Section not found:', sectionName);
    }
}

function updateActiveNavigation(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

function switchToTab(tabsContainer, tabId) {
    console.log('Switching to tab:', tabId);
    
    // Update tab buttons
    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        }
    });
    
    // Update tab panels
    const contentContainer = tabsContainer.nextElementSibling;
    if (contentContainer && contentContainer.classList.contains('tab-content')) {
        contentContainer.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanel = contentContainer.querySelector(`#${tabId}`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('Successfully switched to tab:', tabId);
        } else {
            console.error('Tab panel not found:', tabId);
        }
    }
}

function handleFormInput(e) {
    const element = e.target;
    
    // Only handle form controls
    if (!element.classList.contains('form-control') && 
        element.type !== 'checkbox' && 
        element.type !== 'radio') {
        return;
    }
    
    // Store the value
    storeFormValue(element);
    
    // Schedule auto-save
    scheduleAutoSave();
    
    // Update completion status
    updateSectionCompletion();
}

function storeFormValue(element) {
    const section = getCurrentSectionKey();
    const name = element.name;
    
    if (!name) return;
    
    if (!appState.formData[section]) {
        appState.formData[section] = {};
    }
    
    let value;
    if (element.type === 'checkbox') {
        value = element.checked;
    } else if (element.type === 'radio') {
        if (element.checked) {
            value = element.value;
        } else {
            return; // Don't store unchecked radio values
        }
    } else {
        value = element.value;
    }
    
    appState.formData[section][name] = value;
}

function getCurrentSectionKey() {
    const sectionMap = {
        'introduction': 'businessInfo',
        'cross-contamination': 'crossContamination',
        'cleaning': 'cleaning',
        'chilling': 'chilling',
        'cooking': 'cooking',
        'management': 'management',
        'diary': 'diary'
    };
    
    return sectionMap[appState.currentSection] || 'other';
}

function scheduleAutoSave() {
    if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
    }
    
    autosaveTimeout = setTimeout(() => {
        saveToStorage();
        showNotification('Progress saved automatically', 'success');
    }, AUTOSAVE_INTERVAL);
}

function saveToStorage() {
    try {
        const dataToSave = {
            formData: appState.formData,
            completedSections: Array.from(appState.completedSections),
            lastSaved: new Date().toISOString()
        };
        
        // Store in sessionStorage to persist during the session
        sessionStorage.setItem('sfbbData', JSON.stringify(dataToSave));
        appState.lastSaved = dataToSave.lastSaved;
        
        console.log('Data saved successfully');
        
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data', 'error');
    }
}

function loadSavedData() {
    try {
        const savedDataStr = sessionStorage.getItem('sfbbData');
        
        if (savedDataStr) {
            const savedData = JSON.parse(savedDataStr);
            appState.formData = savedData.formData || {};
            appState.completedSections = new Set(savedData.completedSections || []);
            appState.lastSaved = savedData.lastSaved;
            
            // Populate form fields with saved data
            populateFormFields();
            showNotification('Previous data loaded', 'info');
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
}

function populateFormFields() {
    Object.entries(appState.formData).forEach(([section, data]) => {
        Object.entries(data).forEach(([name, value]) => {
            const elements = document.querySelectorAll(`[name="${name}"]`);
            
            elements.forEach(element => {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(value);
                } else if (element.type === 'radio') {
                    if (element.value === value) {
                        element.checked = true;
                    }
                } else {
                    element.value = value || '';
                }
            });
        });
    });
}

function handleManualSave() {
    saveToStorage();
    showNotification('Progress saved successfully!', 'success');
    
    // Update save button to show feedback
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    }
}

function handlePrint() {
    // Save current data before printing
    saveToStorage();
    
    // Show print notification
    showNotification('Preparing document for printing...', 'info');
    
    // Small delay to ensure notification is visible
    setTimeout(() => {
        window.print();
    }, 500);
}

function addSupplierEntry() {
    const suppliersPanel = document.getElementById('suppliers-list');
    if (!suppliersPanel) return;
    
    const supplierEntries = suppliersPanel.querySelectorAll('.supplier-entry');
    const entryCount = supplierEntries.length;
    
    // Create new supplier entry
    const newEntry = document.createElement('div');
    newEntry.className = 'supplier-entry';
    newEntry.innerHTML = `
        <h4>Supplier ${entryCount + 1}</h4>
        <div class="form-group">
            <label class="form-label">Supplier Name</label>
            <input type="text" class="form-control" name="supplier_name_${entryCount + 1}">
        </div>
        <div class="form-group">
            <label class="form-label">Contact Person</label>
            <input type="text" class="form-control" name="supplier_contact_${entryCount + 1}">
        </div>
        <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="tel" class="form-control" name="supplier_phone_${entryCount + 1}">
        </div>
        <div class="form-group">
            <label class="form-label">Address</label>
            <textarea class="form-control" name="supplier_address_${entryCount + 1}" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Products Supplied</label>
            <textarea class="form-control" name="products_supplied_${entryCount + 1}" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Delivery Days</label>
            <input type="text" class="form-control" name="delivery_days_${entryCount + 1}">
        </div>
        <button type="button" class="btn btn--sm btn--outline remove-supplier">Remove Supplier</button>
    `;
    
    // Add remove functionality
    const removeBtn = newEntry.querySelector('.remove-supplier');
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        newEntry.remove();
        showNotification('Supplier entry removed', 'info');
    });
    
    // Insert before the "Add Another Supplier" button
    const addBtn = document.getElementById('addSupplierBtn');
    addBtn.parentNode.insertBefore(newEntry, addBtn);
    
    showNotification('New supplier entry added', 'success');
}

function updateSectionCompletion() {
    const currentSection = appState.currentSection;
    
    // Count filled fields in current section
    const sectionElement = document.getElementById(currentSection);
    if (!sectionElement) return;
    
    const requiredFields = sectionElement.querySelectorAll('input[required], textarea[required], select[required]');
    const allFields = sectionElement.querySelectorAll('input, textarea, select');
    const filledFields = Array.from(allFields).filter(field => {
        if (field.type === 'checkbox' || field.type === 'radio') {
            return field.checked;
        }
        return field.value && field.value.trim() !== '';
    });
    
    const completionPercentage = allFields.length > 0 ? (filledFields.length / allFields.length) * 100 : 0;
    
    // Mark as completed if more than 50% filled or all required fields are filled
    const requiredFilled = Array.from(requiredFields).every(field => {
        if (field.type === 'checkbox' || field.type === 'radio') {
            return field.checked;
        }
        return field.value && field.value.trim() !== '';
    });
    
    if (completionPercentage > 50 || (requiredFields.length > 0 && requiredFilled)) {
        appState.completedSections.add(currentSection);
        markSectionCompleted(currentSection);
    } else {
        appState.completedSections.delete(currentSection);
        markSectionIncomplete(currentSection);
    }
}

function markSectionCompleted(sectionName) {
    const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.add('completed');
        navItem.title = `${sectionName} - Completed`;
    }
    
    const sectionElement = document.getElementById(sectionName);
    if (sectionElement) {
        const methodForms = sectionElement.querySelectorAll('.method-form, .diary-form, .training-record-form, .suppliers-form, .cleaning-schedule-form, .temperature-records-form, .review-form');
        methodForms.forEach(form => form.classList.add('completed'));
    }
}

function markSectionIncomplete(sectionName) {
    const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (navItem) {
        navItem.classList.remove('completed');
        navItem.title = `${sectionName}`;
    }
    
    const sectionElement = document.getElementById(sectionName);
    if (sectionElement) {
        const methodForms = sectionElement.querySelectorAll('.method-form, .diary-form, .training-record-form, .suppliers-form, .cleaning-schedule-form, .temperature-records-form, .review-form');
        methodForms.forEach(form => form.classList.remove('completed'));
    }
}

function updateUI() {
    // Update completion status for all sections
    const allSections = ['introduction', 'cross-contamination', 'cleaning', 'chilling', 'cooking', 'management', 'diary'];
    
    allSections.forEach(sectionName => {
        if (appState.completedSections.has(sectionName)) {
            markSectionCompleted(sectionName);
        } else {
            markSectionIncomplete(sectionName);
        }
    });
    
    // Show last saved time if available
    if (appState.lastSaved) {
        const lastSavedDate = new Date(appState.lastSaved);
        const timeStr = lastSavedDate.toLocaleTimeString();
        console.log(`Last saved at ${timeStr}`);
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.log(`Notification (${type}): ${message}`);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Form validation helpers
function validateRequiredFields(sectionElement) {
    const requiredFields = sectionElement.querySelectorAll('[required]');
    const invalidFields = [];
    
    requiredFields.forEach(field => {
        let isValid = true;
        
        if (field.type === 'checkbox') {
            isValid = field.checked;
        } else if (field.type === 'radio') {
            const radioGroup = sectionElement.querySelectorAll(`input[name="${field.name}"]`);
            isValid = Array.from(radioGroup).some(radio => radio.checked);
        } else {
            isValid = field.value && field.value.trim() !== '';
        }
        
        if (!isValid) {
            invalidFields.push(field);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });
    
    return invalidFields;
}

// Export functionality for development/testing
function exportData() {
    const exportData = {
        ...appState,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    console.log('SFBB Data Export:', dataStr);
    
    return exportData;
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    // Alt + number keys for quick navigation
    if (e.altKey && e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        const sections = ['introduction', 'cross-contamination', 'cleaning', 'chilling', 'cooking', 'management', 'diary'];
        const sectionIndex = parseInt(e.key) - 1;
        
        if (sections[sectionIndex]) {
            showSection(sections[sectionIndex]);
            const navItem = document.querySelector(`.nav-item[data-section="${sections[sectionIndex]}"]`);
            if (navItem) {
                updateActiveNavigation(navItem);
            }
        }
    }
    
    // Ctrl+S for save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
    }
    
    // Ctrl+P for print
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlePrint();
    }
});

// Handle visibility change for auto-save
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // Save when user switches tabs or minimizes window
        saveToStorage();
    }
});

// Handle beforeunload for unsaved changes warning
window.addEventListener('beforeunload', function(e) {
    // Always save before leaving
    saveToStorage();
});

// Progress indicator
function updateProgressIndicator() {
    const totalSections = 7;
    const completedCount = appState.completedSections.size;
    const percentage = (completedCount / totalSections) * 100;
    
    // Update any progress indicators in the UI
    const progressElements = document.querySelectorAll('.progress-indicator');
    progressElements.forEach(element => {
        element.style.width = percentage + '%';
        element.setAttribute('aria-valuenow', percentage);
    });
}

// Debug function to test navigation
function testNavigation() {
    console.log('Testing navigation...');
    const sections = ['introduction', 'cross-contamination', 'cleaning', 'chilling', 'cooking', 'management', 'diary'];
    
    sections.forEach((section, index) => {
        setTimeout(() => {
            console.log(`Testing section: ${section}`);
            showSection(section);
            const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
            if (navItem) {
                updateActiveNavigation(navItem);
            }
        }, index * 1000);
    });
}

// Make functions available globally for debugging
window.sfbbApp = {
    exportData,
    showNotification,
    saveToStorage,
    loadSavedData,
    showSection,
    testNavigation,
    appState
};

// Log initialization
console.log('SFBB Application initialized successfully');