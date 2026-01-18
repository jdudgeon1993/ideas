/* ===================================================================
   ONBOARDING MODULE - Bulk Entry & Quick Setup
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

  // Wire up buttons
  document.getElementById('bulk-entry-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openBulkEntryModal(), 100);
  });

  document.getElementById('csv-upload-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openCsvUploadModal(), 100);
  });

  document.getElementById('sample-data-btn')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => loadSampleData(), 100);
  });
}

function openBulkEntryModal() {
  const contentHTML = `
    ${modalFull(`
      <h3 style="margin-bottom:0.75rem;">Bulk Pantry Entry</h3>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom:1rem;">
        Add multiple items. Press Tab to move between cells, Enter for new row.
      </p>

      <div style="overflow-x:auto; margin-bottom:1rem;">
        <table id="bulk-entry-table" style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead>
            <tr style="background:rgba(255,255,255,0.1);">
              <th style="padding:0.5rem; text-align:left; border:1px solid rgba(255,255,255,0.1);">Item Name</th>
              <th style="padding:0.5rem; text-align:left; border:1px solid rgba(255,255,255,0.1); width:70px;">Qty</th>
              <th style="padding:0.5rem; text-align:left; border:1px solid rgba(255,255,255,0.1); width:70px;">Unit</th>
              <th style="padding:0.5rem; text-align:left; border:1px solid rgba(255,255,255,0.1);">Category</th>
              <th style="padding:0.5rem; text-align:left; border:1px solid rgba(255,255,255,0.1);">Location</th>
              <th style="padding:0.5rem; text-align:center; border:1px solid rgba(255,255,255,0.1); width:40px;"></th>
            </tr>
          </thead>
          <tbody id="bulk-entry-tbody">
            ${generateBulkEntryRows(5)}
          </tbody>
        </table>
      </div>

      <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
        <button class="btn btn-secondary" id="add-rows-btn">+ Add 5 Rows</button>
        <button class="btn btn-secondary" id="clear-table-btn">Clear All</button>
      </div>

      <div style="padding:0.75rem; background:rgba(180,160,140,0.1); border-radius:6px; font-size:0.85rem;">
        <strong>💡 Tip:</strong> Leave fields blank if not needed. You can paste from Excel!
      </div>
    `)}
  `;

  openCardModal({
    title: "Bulk Entry",
    subtitle: "Add multiple pantry items at once",
    contentHTML,
    slideout: true,
    actions: [
      {
        label: "Save All Items",
        class: "btn-primary",
        onClick: () => saveBulkEntryItems()
      },
      {
        label: "Cancel",
        class: "btn-secondary",
        onClick: closeModal
      }
    ]
  });

  setupBulkEntryHandlers();
}

function generateBulkEntryRows(count) {
  let rows = '';
  for (let i = 0; i < count; i++) {
    rows += `
      <tr class="bulk-entry-row">
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1);">
          <input type="text" class="bulk-input" data-field="name" placeholder="e.g., Tomatoes" style="width:100%; padding:0.5rem; background:transparent; border:none; color:inherit; font-family:inherit;">
        </td>
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1);">
          <input type="number" class="bulk-input" data-field="quantity" placeholder="0" min="0" step="0.1" style="width:100%; padding:0.5rem; background:transparent; border:none; color:inherit; font-family:inherit;">
        </td>
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1);">
          <input type="text" class="bulk-input" data-field="unit" placeholder="lbs" list="unit-suggestions" style="width:100%; padding:0.5rem; background:transparent; border:none; color:inherit; font-family:inherit;">
        </td>
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1);">
          <input type="text" class="bulk-input" data-field="category" placeholder="Produce" list="category-suggestions" style="width:100%; padding:0.5rem; background:transparent; border:none; color:inherit; font-family:inherit;">
        </td>
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1);">
          <input type="text" class="bulk-input" data-field="location" placeholder="Fridge" list="location-suggestions" style="width:100%; padding:0.5rem; background:transparent; border:none; color:inherit; font-family:inherit;">
        </td>
        <td style="padding:0; border:1px solid rgba(255,255,255,0.1); text-align:center;">
          <button class="btn-remove-row" style="background:none; border:none; color:inherit; cursor:pointer; opacity:0.6; padding:0.5rem; font-size:1.2rem;" title="Remove row">&times;</button>
        </td>
      </tr>
    `;
  }
  return rows;
}

function setupBulkEntryHandlers() {
  document.getElementById('add-rows-btn')?.addEventListener('click', () => {
    const tbody = document.getElementById('bulk-entry-tbody');
    if (tbody) {
      tbody.insertAdjacentHTML('beforeend', generateBulkEntryRows(5));
      setupRemoveRowButtons();
    }
  });

  document.getElementById('clear-table-btn')?.addEventListener('click', () => {
    if (confirm('Clear all entries?')) {
      const tbody = document.getElementById('bulk-entry-tbody');
      if (tbody) {
        tbody.innerHTML = generateBulkEntryRows(5);
        setupRemoveRowButtons();
      }
    }
  });

  setupRemoveRowButtons();
}

function setupRemoveRowButtons() {
  document.querySelectorAll('.btn-remove-row').forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.replaceWith(newBtn);
    newBtn.addEventListener('click', () => {
      newBtn.closest('tr').remove();
    });
  });
}

async function saveBulkEntryItems() {
  const rows = document.querySelectorAll('.bulk-entry-row');
  const items = [];

  rows.forEach(row => {
    const inputs = row.querySelectorAll('.bulk-input');
    const name = inputs[0].value.trim();
    const quantity = parseFloat(inputs[1].value) || 0;
    const unit = inputs[2].value.trim() || 'units';
    const category = inputs[3].value.trim() || 'Uncategorized';
    const location = inputs[4].value.trim() || 'Pantry';

    if (name) {
      items.push({ name, quantity, unit, category, location });
    }
  });

  if (items.length === 0) {
    showToast('⚠️ No items to add');
    return;
  }

  for (const item of items) {
    await addIngredient(item.name, item.quantity, item.unit, item.category, item.location);
  }

  showToast(`✅ Added ${items.length} item${items.length !== 1 ? 's' : ''}`);
  renderPantry();
  closeModal();
}

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
