/**
 * Shopping List Focus Mode - Python Age 5.0
 *
 * "The shopping list is what makes everything beat!"
 *
 * Focus mode: Full-screen shopping list for when you're at the store.
 * - Check off items as you shop
 * - Add items on the fly
 * - Clean, distraction-free interface
 * - Exit back to main app when done
 */

class ShoppingFocusMode {
  constructor() {
    this.isActive = false;
    this.shoppingList = [];
    this.overlay = null;
  }

  /**
   * Enter focus mode
   */
  async enter() {
    if (this.isActive) return;

    this.isActive = true;

    // Load shopping list
    await this.loadShoppingList();

    // Create overlay
    this.createOverlay();

    // Render list
    this.render();

    // Add keyboard shortcuts
    this.addKeyboardShortcuts();
  }

  /**
   * Exit focus mode
   */
  exit() {
    if (!this.isActive) return;

    this.isActive = false;

    // Remove overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    // Remove keyboard shortcuts
    this.removeKeyboardShortcuts();

    // Trigger app refresh
    if (window.app && window.app.loadAllData) {
      window.app.loadAllData();
    }
  }

  /**
   * Load shopping list from API
   */
  async loadShoppingList() {
    try {
      const data = await API.getShoppingList();
      this.shoppingList = data.shopping_list || [];
    } catch (error) {
      console.error('Failed to load shopping list:', error);
      this.shoppingList = [];
    }
  }

  /**
   * Create focus mode overlay
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'shopping-focus-mode';
    this.overlay.className = 'shopping-focus-overlay';

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';  // Prevent background scrolling
  }

  /**
   * Render shopping list
   */
  render() {
    if (!this.overlay) return;

    const unchecked = this.shoppingList.filter(item => !item.checked);
    const checked = this.shoppingList.filter(item => item.checked);

    const progress = this.shoppingList.length > 0
      ? Math.round((checked.length / this.shoppingList.length) * 100)
      : 0;

    this.overlay.innerHTML = `
      <div class="focus-container">
        <!-- Header -->
        <div class="focus-header">
          <h1>🛒 Shopping List</h1>
          <div class="focus-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">
              ${checked.length} / ${this.shoppingList.length} items
            </div>
          </div>
          <button class="focus-exit-btn" onclick="window.shoppingFocus.exit()">
            Done Shopping
          </button>
        </div>

        <!-- Shopping List -->
        <div class="focus-content">
          ${unchecked.length === 0 && checked.length === 0 ? `
            <div class="focus-empty">
              <div class="empty-icon">✅</div>
              <h2>All set!</h2>
              <p>Your shopping list is empty.</p>
              <p>Add items below or exit focus mode.</p>
            </div>
          ` : ''}

          ${unchecked.length > 0 ? `
            <div class="focus-section">
              <h2>To Buy (${unchecked.length})</h2>
              <div class="focus-items">
                ${unchecked.map(item => this.renderItem(item, false)).join('')}
              </div>
            </div>
          ` : ''}

          ${checked.length > 0 ? `
            <div class="focus-section checked-section">
              <h2>✓ Checked Off (${checked.length})</h2>
              <div class="focus-items">
                ${checked.map(item => this.renderItem(item, true)).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Footer Actions -->
        <div class="focus-footer">
          <button class="focus-btn" onclick="window.shoppingFocus.showAddItemDialog()">
            ➕ Add Item
          </button>
          ${checked.length > 0 ? `
            <button class="focus-btn secondary" onclick="window.shoppingFocus.addCheckedToPantry()">
              📦 Add Checked to Pantry
            </button>
            <button class="focus-btn secondary" onclick="window.shoppingFocus.clearChecked()">
              🗑️ Clear Checked
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Add event listeners
    this.attachEventListeners();
  }

  /**
   * Render single shopping item
   */
  renderItem(item, isChecked) {
    const itemKey = item.id || `${item.name}-${item.unit}`;

    return `
      <div class="focus-item ${isChecked ? 'checked' : ''}" data-item-key="${itemKey}">
        <div class="item-checkbox">
          <input
            type="checkbox"
            ${isChecked ? 'checked' : ''}
            onchange="window.shoppingFocus.toggleItem('${itemKey}', this.checked)"
          >
        </div>
        <div class="item-content">
          <div class="item-name">${item.name}</div>
          <div class="item-details">
            <span class="item-quantity">${item.quantity} ${item.unit}</span>
            <span class="item-category">${item.category}</span>
            <span class="item-source">${item.source}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Already handled via inline onclick
  }

  /**
   * Toggle item checked status
   */
  async toggleItem(itemKey, checked) {
    try {
      // Find item
      const item = this.shoppingList.find(i =>
        (i.id && i.id === itemKey) ||
        `${i.name}-${i.unit}` === itemKey
      );

      if (!item) return;

      // Only update if it's a manual item (has ID)
      if (item.id) {
        await API.updateShoppingItem(item.id, { checked });
      }

      // Update local state
      item.checked = checked;

      // Re-render
      this.render();

    } catch (error) {
      console.error('Failed to toggle item:', error);
      alert('Failed to update item. Please try again.');
    }
  }

  /**
   * Show add item dialog
   */
  showAddItemDialog() {
    const name = prompt('Item name:');
    if (!name) return;

    const quantity = parseFloat(prompt('Quantity:', '1'));
    if (!quantity || quantity <= 0) return;

    const unit = prompt('Unit:', 'unit');
    if (!unit) return;

    const category = prompt('Category (optional):', 'Other');

    this.addItem({ name, quantity, unit, category: category || 'Other' });
  }

  /**
   * Add item to shopping list
   */
  async addItem(item) {
    try {
      await API.addManualShoppingItem(item);
      await this.loadShoppingList();
      this.render();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item. Please try again.');
    }
  }

  /**
   * Clear checked items
   */
  async clearChecked() {
    if (!confirm('Remove all checked items from the list?')) return;

    try {
      await API.clearCheckedItems();
      await this.loadShoppingList();
      this.render();
    } catch (error) {
      console.error('Failed to clear checked items:', error);
      alert('Failed to clear items. Please try again.');
    }
  }

  /**
   * Add checked items to pantry
   */
  async addCheckedToPantry() {
    if (!confirm('Add all checked items to your pantry?')) return;

    try {
      const result = await API.addCheckedToPantry();
      alert(`✓ Added ${result.added_count} items to pantry!`);
      await this.loadShoppingList();
      this.render();
    } catch (error) {
      console.error('Failed to add to pantry:', error);
      alert('Failed to add items to pantry. Please try again.');
    }
  }

  /**
   * Add keyboard shortcuts
   */
  addKeyboardShortcuts() {
    this.keyHandler = (e) => {
      // ESC to exit
      if (e.key === 'Escape') {
        this.exit();
      }
    };

    document.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Remove keyboard shortcuts
   */
  removeKeyboardShortcuts() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }
}

// Create global instance
window.shoppingFocus = new ShoppingFocusMode();
