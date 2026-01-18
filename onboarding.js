/* ===================================================================
   ONBOARDING MODULE - Real-Time Collaborative Bulk Entry
   =================================================================== */

// State
let draftRows = []; // Loaded from Supabase
let saveTimeout = null;
let isOnboardingActive = false;

/* ===================================================================
   MAIN MODAL - Quick Setup Options
   =================================================================== */

function openOnboardingModal() {
  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.75rem;">Quick Setup Options</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:1rem;">
        Get started quickly by adding multiple pantry items at once.
      </p>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <button class="btn btn-primary" id="bulk-entry-btn" style="width:100%; padding:1rem; text-align:left;">
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.25rem;">📝 Bulk Pantry Entry</div>
          <div style="font-size:0.85rem; opacity:0.8;">Add multiple items using a spreadsheet-style table</div>
        </button>

        <button class="btn btn-secondary" id="csv-upload-btn" style="width:100%; padding:1rem; text-align:left;">
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.25rem;">📤 Upload CSV</div>
          <div style="font-size:0.85rem; opacity:0.8;">Import from a spreadsheet file</div>
        </button>

        <button class="btn btn-secondary" id="sample-data-btn" style="width:100%; padding:1rem; text-align:left;">
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:0.25rem;">🎯 Load Sample Data</div>
          <div style="font-size:0.85rem; opacity:0.8;">Try the app with pre-filled recipes and ingredients</div>
        </button>
      </div>

      <div style="margin-top:1.5rem; padding:1rem; background:rgba(255,255,255,0.05); border-radius:8px;">
        <h4 style="margin:0 0 0.5rem 0; font-size:0.9rem;">💡 Multi-Device Sync</h4>
        <p style="margin:0; font-size:0.85rem; opacity:0.8; line-height:1.6;">
          Add items on your phone while reviewing on desktop - changes sync in real-time across all devices!
        </p>
      </div>
    `)}
  `;

  openCardModal({
    title: "Quick Setup",
    subtitle: "Add your pantry items quickly",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Close",
        class: "btn-primary",
        onClick: closeModal
      }
    ]
  });

  // Wire up bulk entry button - Opens full-screen section
  document.getElementById('bulk-entry-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openBulkEntrySection(), 100);
  });

  // Wire up CSV upload button
  document.getElementById('csv-upload-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openCsvUploadModal(), 100);
  });

  // Wire up sample data button
  document.getElementById('sample-data-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => loadSampleData(), 100);
  });
}

/* ===================================================================
   FULL-SCREEN BULK ENTRY SECTION
   =================================================================== */

async function openBulkEntrySection() {
  // Switch to onboarding section
  const onboardingRadio = document.getElementById('nav-onboarding');
  if (onboardingRadio) {
    onboardingRadio.checked = true;
  }

  isOnboardingActive = true;

  // Load existing drafts from Supabase
  await loadDrafts();

  // Render rows
  renderBulkEntryRows();

  // Setup event listeners
  setupBulkEntryListeners();

  // Update status
  updateItemCount();
  setDraftStatus('loaded');
}

async function loadDrafts() {
  if (!window.db || !window.auth || !window.auth.isAuthenticated()) {
    console.log('Not authenticated - using empty drafts');
    draftRows = [];
    return;
  }

  try {
    const drafts = await window.db.loadBulkEntryDrafts();
    draftRows = drafts.map(draft => ({
      rowNumber: draft.row_number,
      name: draft.item_name || '',
      quantity: draft.quantity || '',
      unit: draft.unit || '',
      category: draft.category || '',
      location: draft.location || ''
    }));

    console.log(`📥 Loaded ${draftRows.length} draft rows from Supabase`);

    // If no drafts, start with 10 empty rows
    if (draftRows.length === 0) {
      for (let i = 0; i < 10; i++) {
        draftRows.push({
          rowNumber: i,
          name: '',
          quantity: '',
          unit: '',
          category: '',
          location: ''
        });
      }
    }
  } catch (err) {
    console.error('Error loading drafts:', err);
    // Start with empty rows
    draftRows = [];
    for (let i = 0; i < 10; i++) {
      draftRows.push({
        rowNumber: i,
        name: '',
        quantity: '',
        unit: '',
        category: '',
        location: ''
      });
    }
  }
}

function renderBulkEntryRows() {
  const tbody = document.getElementById('bulk-entry-tbody-live');
  if (!tbody) return;

  tbody.innerHTML = '';

  draftRows.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.className = 'bulk-entry-row-live';
    tr.dataset.rowNumber = row.rowNumber;

    tr.innerHTML = `
      <td>
        <input type="text"
               class="bulk-input"
               data-field="name"
               data-row="${row.rowNumber}"
               value="${row.name || ''}"
               placeholder="e.g., Tomatoes">
      </td>
      <td>
        <input type="number"
               class="bulk-input"
               data-field="quantity"
               data-row="${row.rowNumber}"
               value="${row.quantity || ''}"
               placeholder="0"
               min="0"
               step="0.1">
      </td>
      <td>
        <input type="text"
               class="bulk-input"
               data-field="unit"
               data-row="${row.rowNumber}"
               value="${row.unit || ''}"
               placeholder="lbs">
      </td>
      <td>
        <input type="text"
               class="bulk-input"
               data-field="category"
               data-row="${row.rowNumber}"
               value="${row.category || ''}"
               placeholder="Produce">
      </td>
      <td>
        <input type="text"
               class="bulk-input"
               data-field="location"
               data-row="${row.rowNumber}"
               value="${row.location || ''}"
               placeholder="Fridge">
      </td>
      <td style="text-align: center;">
        <button class="btn-remove-row" data-row="${row.rowNumber}" title="Remove row">&times;</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Wire up input listeners
  const inputs = tbody.querySelectorAll('.bulk-input');
  inputs.forEach(input => {
    input.addEventListener('input', handleInputChange);
  });

  // Wire up remove buttons
  const removeButtons = tbody.querySelectorAll('.btn-remove-row');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const rowNumber = parseInt(btn.dataset.row);
      removeRow(rowNumber);
    });
  });
}

function setupBulkEntryListeners() {
  // Add rows button
  const addRowsBtn = document.getElementById('btn-add-rows-live');
  if (addRowsBtn) {
    addRowsBtn.onclick = () => addRows(5);
  }

  // Clear all button
  const clearAllBtn = document.getElementById('btn-clear-all-live');
  if (clearAllBtn) {
    clearAllBtn.onclick = () => handleClearAll();
  }

  // Save all items button
  const saveAllBtn = document.getElementById('btn-save-all-items');
  if (saveAllBtn) {
    saveAllBtn.onclick = () => handleSaveAllItems();
  }

  // Exit button
  const exitBtn = document.getElementById('btn-exit-onboarding');
  if (exitBtn) {
    exitBtn.onclick = () => handleExit();
  }
}

function handleInputChange(event) {
  const input = event.target;
  const rowNumber = parseInt(input.dataset.row);
  const field = input.dataset.field;
  const value = input.value;

  // Update local state
  const row = draftRows.find(r => r.rowNumber === rowNumber);
  if (row) {
    row[field] = value;
  }

  // Debounced save to Supabase
  setDraftStatus('saving');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDraftRow(rowNumber);
  }, 500); // 500ms debounce

  // Update item count
  updateItemCount();
}

async function saveDraftRow(rowNumber) {
  if (!window.db || !window.auth || !window.auth.isAuthenticated()) {
    setDraftStatus('offline');
    return;
  }

  const row = draftRows.find(r => r.rowNumber === rowNumber);
  if (!row) return;

  // Mark as our own change (for debounce)
  if (window.realtime && window.realtime.lastLocalUpdate) {
    window.realtime.lastLocalUpdate.bulkEntry = Date.now();
  }

  try {
    await window.db.saveBulkEntryDraftRow(rowNumber, {
      name: row.name || null,
      quantity: row.quantity || null,
      unit: row.unit || null,
      category: row.category || null,
      location: row.location || null
    });

    setDraftStatus('saved');
  } catch (err) {
    console.error('Error saving draft row:', err);
    setDraftStatus('error');
  }
}

function addRows(count) {
  const maxRowNumber = Math.max(...draftRows.map(r => r.rowNumber), -1);

  for (let i = 0; i < count; i++) {
    draftRows.push({
      rowNumber: maxRowNumber + i + 1,
      name: '',
      quantity: '',
      unit: '',
      category: '',
      location: ''
    });
  }

  renderBulkEntryRows();
  updateItemCount();
}

async function removeRow(rowNumber) {
  // Remove from local state
  draftRows = draftRows.filter(r => r.rowNumber !== rowNumber);

  // Remove from Supabase
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    if (window.realtime && window.realtime.lastLocalUpdate) {
      window.realtime.lastLocalUpdate.bulkEntry = Date.now();
    }
    await window.db.deleteBulkEntryDraftRow(rowNumber);
  }

  renderBulkEntryRows();
  updateItemCount();
}

async function handleClearAll() {
  if (!confirm('Clear all draft entries? This cannot be undone.')) {
    return;
  }

  // Clear local state
  draftRows = [];
  for (let i = 0; i < 10; i++) {
    draftRows.push({
      rowNumber: i,
      name: '',
      quantity: '',
      unit: '',
      category: '',
      location: ''
    });
  }

  // Clear from Supabase
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    if (window.realtime && window.realtime.lastLocalUpdate) {
      window.realtime.lastLocalUpdate.bulkEntry = Date.now();
    }
    await window.db.clearAllBulkEntryDrafts();
  }

  renderBulkEntryRows();
  updateItemCount();
  setDraftStatus('cleared');
}

async function handleSaveAllItems() {
  // Get non-empty rows
  const items = draftRows.filter(row => row.name && row.name.trim());

  if (items.length === 0) {
    showToast('⚠️ No items to add');
    return;
  }

  const confirmMsg = `Add ${items.length} item${items.length !== 1 ? 's' : ''} to your pantry?`;
  if (!confirm(confirmMsg)) {
    return;
  }

  // Update button state
  const saveBtn = document.getElementById('btn-save-all-items');
  const saveBtnText = document.getElementById('btn-save-text');
  if (saveBtn) {
    saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = 'Adding items...';
  }

  // Add items to pantry
  let addedCount = 0;
  for (const item of items) {
    try {
      await addIngredient(
        item.name,
        parseFloat(item.quantity) || 0,
        item.unit || 'units',
        item.category || 'Uncategorized',
        item.location || 'Pantry'
      );
      addedCount++;
    } catch (err) {
      console.error('Error adding item:', item.name, err);
    }
  }

  // Clear drafts from Supabase
  if (window.db && window.auth && window.auth.isAuthenticated()) {
    await window.db.clearAllBulkEntryDrafts();
  }

  // Show success
  showToast(`✅ Added ${addedCount} item${addedCount !== 1 ? 's' : ''} to pantry`);
  renderPantry();

  // Close onboarding and return to pantry
  closeOnboardingSection();
}

function handleExit() {
  // Check for unsaved changes (non-empty rows)
  const hasData = draftRows.some(row => row.name && row.name.trim());

  if (hasData) {
    if (!confirm('Exit bulk entry? Your draft will be saved and you can resume later.')) {
      return;
    }
  }

  closeOnboardingSection();
}

function closeOnboardingSection() {
  isOnboardingActive = false;

  // Switch back to pantry section
  const pantryRadio = document.getElementById('nav-pantry');
  if (pantryRadio) {
    pantryRadio.checked = true;
  }

  // Reset state
  draftRows = [];
}

function updateItemCount() {
  const itemCount = draftRows.filter(row => row.name && row.name.trim()).length;
  const countEl = document.getElementById('onboarding-item-count');
  if (countEl) {
    countEl.textContent = `${itemCount} item${itemCount !== 1 ? 's' : ''} entered`;
  }
}

function setDraftStatus(status) {
  const statusEl = document.getElementById('onboarding-draft-status');
  if (!statusEl) return;

  switch (status) {
    case 'saving':
      statusEl.textContent = 'Saving...';
      statusEl.style.background = 'rgba(139, 147, 118, 0.2)';
      break;
    case 'saved':
      statusEl.textContent = 'Draft auto-saved';
      statusEl.style.background = 'rgba(139, 147, 118, 0.1)';
      break;
    case 'loaded':
      statusEl.textContent = 'Draft loaded';
      statusEl.style.background = 'rgba(139, 147, 118, 0.1)';
      break;
    case 'cleared':
      statusEl.textContent = 'Draft cleared';
      statusEl.style.background = 'rgba(139, 147, 118, 0.1)';
      break;
    case 'offline':
      statusEl.textContent = 'Offline mode';
      statusEl.style.background = 'rgba(180, 160, 140, 0.2)';
      break;
    case 'error':
      statusEl.textContent = 'Save error';
      statusEl.style.background = 'rgba(179, 106, 94, 0.2)';
      break;
  }
}

/* ===================================================================
   REALTIME SYNC - Handle changes from other devices
   =================================================================== */

async function handleRealtimeBulkEntryChange(payload) {
  if (!isOnboardingActive) return;

  console.log('📡 Realtime bulk entry change:', payload.eventType, payload.new);

  // Reload all drafts
  await loadDrafts();
  renderBulkEntryRows();
  updateItemCount();
}

// Expose to window for realtime.js
window.onBulkEntryDraftChange = handleRealtimeBulkEntryChange;

/* ===================================================================
   CSV UPLOAD (Legacy Modal)
   =================================================================== */

function openCsvUploadModal() {
  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.75rem;">Upload CSV File</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:1rem;">
        Upload a CSV file with columns: <strong>name, quantity, unit, category, location</strong>
      </p>

      <input type="file" id="csv-file-input" accept=".csv" style="width:100%; padding:0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; cursor:pointer; margin-bottom:1rem;">

      <div id="csv-preview" style="display:none; margin-top:1rem;">
        <h4 style="margin:0 0 0.5rem 0;">Preview:</h4>
        <div id="csv-preview-content" style="max-height:200px; overflow:auto; padding:0.75rem; background:rgba(255,255,255,0.05); border-radius:6px; font-size:0.85rem;"></div>
      </div>

      <div style="margin-top:1rem; padding:0.75rem; background:rgba(180,160,140,0.1); border-radius:6px; font-size:0.85rem;">
        <strong>📁 Example CSV:</strong><br>
        <code style="display:block; margin-top:0.5rem; opacity:0.8;">
          name,quantity,unit,category,location<br>
          Tomatoes,5,lbs,Produce,Fridge<br>
          Milk,1,gallon,Dairy,Fridge
        </code>
      </div>
    `)}
  `;

  openCardModal({
    title: "CSV Upload",
    subtitle: "Import pantry items from a file",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Import Items",
        class: "btn-primary",
        onClick: () => processCsvUpload()
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  document.getElementById('csv-file-input')?.addEventListener('change', handleCsvFileSelect);
}

let csvData = [];

function handleCsvFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    csvData = parseCsv(text);

    const preview = document.getElementById('csv-preview');
    const previewContent = document.getElementById('csv-preview-content');

    if (preview && previewContent && csvData.length > 0) {
      preview.style.display = 'block';
      previewContent.innerHTML = `
        <strong>Found ${csvData.length} items:</strong><br><br>
        ${csvData.slice(0, 5).map(item => `• ${item.name}`).join('<br>')}
        ${csvData.length > 5 ? '<br>...and ' + (csvData.length - 5) + ' more' : ''}
      `;
    }
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index]?.trim() || '';
    });

    if (item.name) {
      items.push({
        name: item.name,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || 'units',
        category: item.category || 'Uncategorized',
        location: item.location || 'Pantry'
      });
    }
  }

  return items;
}

async function processCsvUpload() {
  if (csvData.length === 0) {
    showToast('⚠️ No items to import');
    return;
  }

  for (const item of csvData) {
    await addIngredient(item.name, item.quantity, item.unit, item.category, item.location);
  }

  showToast(`✅ Imported ${csvData.length} items`);
  renderPantry();
  closeModal();
  csvData = [];
}

/* ===================================================================
   SAMPLE DATA LOADER
   =================================================================== */

async function loadSampleData() {
  if (!confirm('This will add sample recipes and pantry items. Continue?')) {
    return;
  }

  const sampleRecipes = [
    {
      name: 'Spaghetti Carbonara',
      servings: 4,
      ingredients: ['Spaghetti|1|lb', 'Bacon|8|slices', 'Eggs|4|whole', 'Parmesan|1|cup', 'Black Pepper|1|tsp'],
      instructions: 'Cook pasta. Fry bacon. Mix eggs and cheese. Combine with hot pasta. Season with pepper.',
      category: 'Dinner',
      tags: ['quick', 'italian'],
      isFavorite: false
    },
    {
      name: 'Chicken Tacos',
      servings: 6,
      ingredients: ['Chicken Breast|2|lbs', 'Taco Shells|12|shells', 'Lettuce|1|head', 'Tomatoes|2|whole', 'Cheese|2|cups'],
      instructions: 'Cook chicken with spices. Warm shells. Chop vegetables. Assemble tacos.',
      category: 'Dinner',
      tags: ['easy', 'mexican'],
      isFavorite: false
    },
    {
      name: 'Pancakes',
      servings: 4,
      ingredients: ['Flour|2|cups', 'Milk|1.5|cups', 'Eggs|2|whole', 'Butter|2|tbsp', 'Baking Powder|1|tbsp'],
      instructions: 'Mix dry ingredients. Add wet ingredients. Cook on griddle until golden.',
      category: 'Breakfast',
      tags: ['breakfast', 'classic'],
      isFavorite: false
    }
  ];

  for (const recipe of sampleRecipes) {
    await addOrUpdateRecipe({ id: uid(), ...recipe });
  }

  const samplePantry = [
    { name: 'Tomatoes', quantity: 5, unit: 'whole', category: 'Produce', location: 'Fridge' },
    { name: 'Onions', quantity: 3, unit: 'whole', category: 'Produce', location: 'Pantry' },
    { name: 'Garlic', quantity: 10, unit: 'cloves', category: 'Produce', location: 'Pantry' },
    { name: 'Milk', quantity: 1, unit: 'gallon', category: 'Dairy', location: 'Fridge' },
    { name: 'Eggs', quantity: 12, unit: 'whole', category: 'Dairy', location: 'Fridge' },
    { name: 'Flour', quantity: 5, unit: 'lbs', category: 'Baking', location: 'Pantry' },
    { name: 'Sugar', quantity: 2, unit: 'lbs', category: 'Baking', location: 'Pantry' },
    { name: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'Oils', location: 'Pantry' },
    { name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'Meat', location: 'Freezer' },
    { name: 'Ground Beef', quantity: 1, unit: 'lb', category: 'Meat', location: 'Freezer' }
  ];

  for (const item of samplePantry) {
    await addIngredient(item.name, item.quantity, item.unit, item.category, item.location);
  }

  showToast('✅ Sample data loaded!');
  renderRecipes();
  renderPantry();
  closeModal();
}

// Expose to window for global access
window.openOnboardingModal = openOnboardingModal;
