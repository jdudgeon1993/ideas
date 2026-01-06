<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartPantry - Move & Split v5.4</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .tab-active { border-bottom: 3px solid #4f46e5; color: #4f46e5; font-weight: 800; }
        .modal-bg { background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
    </style>
</head>
<body class="bg-gray-50 p-4 md:p-8 font-sans text-gray-900">

    <div x-data="pantryApp()" x-init="init()" x-cloak class="max-w-5xl mx-auto space-y-6">
        
        <nav class="flex border-b border-gray-200 space-x-2 md:space-x-6 overflow-x-auto bg-white p-2 rounded-t-2xl shadow-sm sticky top-0 z-20">
            <template x-for="tab in ['Pantry', 'Recipes', 'Meal Plan', 'Shopping', 'Settings']">
                <button @click="activeTab = tab" :class="activeTab === tab ? 'tab-active' : 'text-gray-400 hover:text-indigo-400'" class="pb-2 px-4 text-xs md:text-sm uppercase tracking-widest transition-all whitespace-nowrap" x-text="tab"></button>
            </template>
        </nav>

        <section x-show="activeTab === 'Pantry'" class="space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-black tracking-tight uppercase">Inventory</h2>
                <select x-model="filterLocation" class="text-sm border p-2 rounded-xl bg-white shadow-sm font-bold text-indigo-600 outline-none">
                    <option value="">All Storage</option>
                    <template x-for="loc in locations">
                        <option :value="loc" x-text="loc"></option>
                    </template>
                </select>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-2">
                        <label class="text-[10px] font-black text-gray-400 uppercase">Item Name</label>
                        <input type="text" x-model="forms.pantry.name" placeholder="Item Name" class="w-full border p-2 rounded-xl outline-none focus:ring-2 ring-indigo-100">
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-indigo-500 uppercase">Batch Expiry</label>
                        <input type="date" x-model="forms.pantry.expiry_date" class="w-full border p-2 rounded-xl bg-indigo-50 outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase">Qty & Unit</label>
                        <div class="flex">
                            <input type="number" x-model.number="forms.pantry.qty" class="w-1/2 border p-2 rounded-l-xl">
                            <input type="text" x-model="forms.pantry.unit" placeholder="Unit" class="w-1/2 border p-2 rounded-r-xl border-l-0">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-orange-500 uppercase">Min Stock</label>
                        <input type="number" x-model.number="forms.pantry.min_threshold" class="w-full border p-2 rounded-xl">
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase">Initial Location</label>
                        <select x-model="forms.pantry.location" class="w-full border p-2 rounded-xl">
                            <template x-for="loc in locations">
                                <option :value="loc" x-text="loc"></option>
                            </template>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-gray-400 uppercase">Category</label>
                        <select x-model="forms.pantry.category" class="w-full border p-2 rounded-xl">
                            <template x-for="cat in categories">
                                <option :value="cat" x-text="cat"></option>
                            </template>
                        </select>
                    </div>
                    <button @click="savePantryItem()" class="md:col-span-1 bg-indigo-600 text-white p-2 rounded-xl font-black hover:bg-indigo-700 transition self-end h-[42px]">Add to Stock</button>
                </div>
            </div>

            <div class="grid gap-4">
                <template x-for="item in filteredPantryItems" :key="item.id">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" :class="getTotalQty(item) <= item.min_threshold ? 'border-orange-300 ring-1 ring-orange-100' : ''">
                        <div class="p-4 flex justify-between items-center bg-white border-b border-gray-50">
                            <div>
                                <h3 class="font-black text-lg text-gray-800" x-text="item.name"></h3>
                                <span class="text-[10px] font-black text-gray-400 uppercase" x-text="item.category"></span>
                            </div>
                            <div class="text-right">
                                <span class="text-2xl font-black text-gray-800" x-text="getTotalQty(item)"></span>
                                <span class="text-[10px] text-gray-400 font-black block uppercase" x-text="item.unit"></span>
                            </div>
                        </div>

                        <div class="p-3 bg-gray-50/30 space-y-2">
                            <template x-for="(batch, index) in getFilteredBatches(item)">
                                <div class="flex flex-wrap md:flex-nowrap justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm gap-4">
                                    <div class="flex-1 min-w-[120px]">
                                        <div class="flex items-center space-x-2">
                                            <span class="text-[10px] font-black uppercase" :class="getExpiryTextClass(batch.expiry)" x-text="getExpiryLabel(batch.expiry)"></span>
                                            <span class="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-black uppercase" x-text="batch.location"></span>
                                        </div>
                                        <span class="text-xs font-bold text-gray-400" x-text="batch.expiry ? formatDate(batch.expiry) : 'Shelf Stable'"></span>
                                    </div>
                                    
                                    <div class="flex items-center space-x-2">
                                        <button @click="openTransferModal(item, batch)" class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Move some to another location">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        </button>
                                        
                                        <div class="flex items-center bg-gray-50 rounded-xl p-1 border">
                                            <button @click="adjustBatch(item, batch, -0.1)" class="w-8 h-8 font-black text-gray-400 hover:text-red-500">-</button>
                                            <input type="number" step="0.1" x-model.number="batch.qty" @change="save()" class="w-10 bg-transparent text-center font-black text-sm outline-none">
                                            <button @click="adjustBatch(item, batch, 0.1)" class="w-8 h-8 font-black text-gray-400 hover:text-green-500">+</button>
                                        </div>
                                        <button @click="removeBatch(item, batch)" class="text-gray-300 hover:text-red-500 font-black text-xl px-2">&times;</button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </section>

        <section x-show="activeTab === 'Recipes'" class="space-y-4">
            <h2 class="text-2xl font-black tracking-tight uppercase">Recipes</h2>
            <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
                <input type="text" x-model="forms.recipe.title" placeholder="Recipe Title" class="w-full text-xl font-black border-b pb-2 outline-none">
                <div class="flex gap-2">
                    <input type="text" x-model="forms.recipe.ingName" placeholder="Ingredient" class="border p-2 flex-1 rounded-xl text-sm">
                    <input type="number" x-model.number="forms.recipe.ingQty" class="border p-2 w-20 rounded-xl text-sm" placeholder="Qty">
                    <button @click="addIngToRecipeForm()" class="bg-gray-900 text-white px-6 rounded-xl font-black text-[10px] uppercase">Add</button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <template x-for="(ing, idx) in forms.recipe.tempIngs">
                        <div class="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center">
                            <span x-text="ing.name + ': ' + ing.qty"></span>
                            <button @click="forms.recipe.tempIngs.splice(idx, 1)" class="ml-2">&times;</button>
                        </div>
                    </template>
                </div>
                <button @click="saveRecipe()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Save Recipe</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <template x-for="recipe in recipes" :key="recipe.id">
                    <div class="bg-white p-5 rounded-2xl border-white hover:border-indigo-100 border-2 transition-all shadow-sm">
                        <div class="flex justify-between">
                            <h3 class="font-black text-lg" x-text="recipe.title"></h3>
                            <button @click="deleteItem('recipes', recipe.id)" class="text-[10px] font-black text-gray-300 hover:text-red-500 uppercase">Del</button>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-4">
                            <template x-for="i in recipe.ingredients">
                                <span class="text-[10px] px-2 py-1 rounded-md border font-black uppercase" :class="getIngredientStatusClass(i.name)" x-text="i.name"></span>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </section>

        <section x-show="activeTab === 'Meal Plan'" class="space-y-4">
            <h2 class="text-2xl font-black tracking-tight uppercase">Schedule</h2>
            <div class="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap gap-2 shadow-sm">
                <select x-model="forms.plan.recipeId" class="border p-2 flex-1 rounded-xl text-sm font-bold outline-none">
                    <option value="">Choose Recipe...</option>
                    <template x-for="r in recipes">
                        <option :value="r.id" x-text="r.title"></option>
                    </template>
                </select>
                <input type="date" x-model="forms.plan.date" class="border p-2 rounded-xl text-sm font-bold outline-none">
                <button @click="addToPlan()" class="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px]">Add to Plan</button>
            </div>
            <div class="grid gap-3">
                <template x-for="plan in sortedMealPlan" :key="plan.id">
                    <div class="bg-white p-4 flex justify-between items-center rounded-2xl border-l-4 border-indigo-500 shadow-sm">
                        <div class="flex items-center space-x-4">
                            <div class="bg-gray-50 p-2 rounded-xl text-center min-w-[65px]">
                                <span class="text-[10px] font-black text-gray-400 block uppercase" x-text="formatDateDay(plan.date)"></span>
                                <span class="text-xl font-black text-indigo-600" x-text="formatDateNum(plan.date)"></span>
                            </div>
                            <h4 class="font-black text-gray-800 text-lg" x-text="getRecipeName(plan.recipeId)"></h4>
                        </div>
                        <button @click="cookMeal(plan)" class="bg-gray-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition">Mark Cooked</button>
                    </div>
                </template>
            </div>
        </section>

        <section x-show="activeTab === 'Shopping'" class="space-y-4">
            <h2 class="text-2xl font-black tracking-tight uppercase">Shopping List</h2>
            <div class="space-y-6">
                <template x-for="(items, category) in groupedShoppingList" :key="category">
                    <div class="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
                        <div class="bg-gray-900 px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest" x-text="category"></div>
                        <div class="divide-y divide-gray-50">
                            <template x-for="item in items" :key="item.name">
                                <div class="p-6 flex flex-col lg:flex-row justify-between gap-6">
                                    <div class="flex-1">
                                        <p class="font-black text-2xl text-gray-800" x-text="item.name"></p>
                                        <span class="text-red-500 text-[10px] font-black uppercase" x-text="'Suggested: ' + item.shortage + ' ' + item.unit"></span>
                                    </div>
                                    <div class="bg-indigo-50/50 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end border border-indigo-50">
                                        <div>
                                            <label class="text-[9px] font-black text-indigo-400 uppercase">Bought Qty</label>
                                            <input type="number" x-model.number="item.shortage" class="w-full border p-2 rounded-xl text-sm font-black outline-none">
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-indigo-400 uppercase">Destination</label>
                                            <select x-model="item.location" class="w-full border p-2 rounded-xl text-sm font-black outline-none">
                                                <template x-for="loc in locations">
                                                    <option :value="loc" x-text="loc"></option>
                                                </template>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="text-[9px] font-black text-indigo-400 uppercase">Expiry</label>
                                            <input type="date" x-model="item.boughtExpiry" class="w-full border p-2 rounded-xl text-sm font-black outline-none">
                                        </div>
                                        <button @click="checkoutItem(item)" class="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-md transition active:scale-95">Confirm</button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </section>

        <section x-show="activeTab === 'Settings'" class="space-y-6">
            <h2 class="text-2xl font-black tracking-tight uppercase">Settings</h2>
            <div class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 class="font-black text-xs uppercase text-gray-400 mb-4">Storage Locations</h3>
                <div class="flex mb-4 gap-2">
                    <input type="text" x-model="newLocName" class="border p-2 flex-1 rounded-xl text-sm outline-none" placeholder="e.g. Garage Freezer">
                    <button @click="addLocation()" class="bg-gray-800 text-white px-4 rounded-xl font-black uppercase text-xs">Add</button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <template x-for="loc in locations">
                        <div class="bg-gray-50 px-3 py-1 rounded-lg flex items-center text-[10px] font-black uppercase border border-gray-200">
                            <span x-text="loc"></span>
                            <button @click="removeList('locations', loc)" class="ml-2 text-red-500">&times;</button>
                        </div>
                    </template>
                </div>
            </div>
        </section>

        <div x-show="transferModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-bg" x-transition>
            <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-gray-100" @click.away="transferModal.show = false">
                <h3 class="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Move Item</h3>
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-6" x-text="'Currently in: ' + transferModal.batch?.location"></p>
                
                <div class="space-y-4">
                    <div>
                        <label class="text-[10px] font-black text-indigo-500 uppercase">Quantity to Move</label>
                        <input type="number" step="0.1" x-model.number="transferModal.moveQty" class="w-full border-2 border-indigo-50 p-3 rounded-xl text-lg font-black outline-none focus:border-indigo-400">
                        <p class="text-[9px] text-gray-400 mt-1" x-text="'Max available: ' + transferModal.batch?.qty"></p>
                    </div>
                    <div>
                        <label class="text-[10px] font-black text-indigo-500 uppercase">New Location</label>
                        <select x-model="transferModal.newLoc" class="w-full border-2 border-indigo-50 p-3 rounded-xl font-black text-sm outline-none focus:border-indigo-400">
                            <template x-for="loc in locations">
                                <option :value="loc" x-text="loc"></option>
                            </template>
                        </select>
                    </div>
                    <div class="flex gap-2 pt-4">
                        <button @click="transferModal.show = false" class="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black uppercase text-xs">Cancel</button>
                        <button @click="executeTransfer()" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-100">Move Now</button>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <script>
        function pantryApp() {
            return {
                activeTab: 'Pantry',
                pantry: [],
                recipes: [],
                mealPlan: [],
                shoppingList: [],
                locations: ['Main Freezer', 'Secondary Freezer', 'Kitchen Fridge', 'Main Pantry'],
                categories: ['Produce', 'Dairy', 'Meat', 'Grains', 'Frozen', 'Other'],
                filterLocation: '',
                newLocName: '',
                
                transferModal: { show: false, item: null, batch: null, moveQty: 0, newLoc: '' },

                forms: {
                    pantry: { name: '', qty: 0, min_threshold: 0, unit: '', location: 'Main Pantry', category: 'Other', expiry_date: '' },
                    recipe: { title: '', tempIngs: [], ingName: '', ingQty: 0 },
                    plan: { recipeId: '', date: '' }
                },

                init() {
                    const suffix = 'v5_4';
                    this.pantry = JSON.parse(localStorage.getItem('sp_pantry_' + suffix) || '[]');
                    this.recipes = JSON.parse(localStorage.getItem('sp_recipes_' + suffix) || '[]');
                    this.mealPlan = JSON.parse(localStorage.getItem('sp_plan_' + suffix) || '[]');
                    this.locations = JSON.parse(localStorage.getItem('sp_locations_' + suffix) || JSON.stringify(this.locations));
                    this.generateShoppingList();
                },

                save() {
                    const suffix = 'v5_4';
                    localStorage.setItem('sp_pantry_' + suffix, JSON.stringify(this.pantry));
                    localStorage.setItem('sp_recipes_' + suffix, JSON.stringify(this.recipes));
                    localStorage.setItem('sp_plan_' + suffix, JSON.stringify(this.mealPlan));
                    localStorage.setItem('sp_locations_' + suffix, JSON.stringify(this.locations));
                    this.generateShoppingList();
                },

                // --- TRANSFER LOGIC ---
                openTransferModal(item, batch) {
                    this.transferModal = { show: true, item: item, batch: batch, moveQty: batch.qty, newLoc: this.locations[0] };
                },

                executeTransfer() {
                    const { item, batch, moveQty, newLoc } = this.transferModal;
                    if (moveQty <= 0 || moveQty > batch.qty) return;

                    if (moveQty === batch.qty) {
                        batch.location = newLoc;
                    } else {
                        batch.qty = parseFloat((batch.qty - moveQty).toFixed(2));
                        item.batches.push({ qty: moveQty, expiry: batch.expiry, location: newLoc });
                    }
                    this.sortBatches();
                    this.transferModal.show = false;
                    this.save();
                },

                // --- PANTRY LOGIC ---
                getTotalQty(item) {
                    return item.batches.reduce((sum, b) => sum + (parseFloat(b.qty) || 0), 0);
                },

                getFilteredBatches(item) {
                    return this.filterLocation ? item.batches.filter(b => b.location === this.filterLocation) : item.batches;
                },

                get filteredPantryItems() {
                    let list = this.pantry;
                    if (this.filterLocation) list = list.filter(item => item.batches.some(b => b.location === this.filterLocation));
                    return list.sort((a,b) => a.name.localeCompare(b.name));
                },

                adjustBatch(item, batch, amount) {
                    batch.qty = Math.max(0, parseFloat((batch.qty + amount).toFixed(2)));
                    if (batch.qty <= 0) this.removeBatch(item, batch);
                    this.save();
                },

                removeBatch(item, batch) {
                    item.batches = item.batches.filter(b => b !== batch);
                    if (item.batches.length === 0 && item.min_threshold <= 0) this.pantry = this.pantry.filter(i => i.id !== item.id);
                    this.save();
                },

                savePantryItem() {
                    if(!this.forms.pantry.name) return;
                    const batch = { qty: parseFloat(this.forms.pantry.qty) || 0, expiry: this.forms.pantry.expiry_date, location: this.forms.pantry.location };
                    let existing = this.pantry.find(p => p.name.toLowerCase() === this.forms.pantry.name.toLowerCase());
                    if (existing) {
                        if (batch.qty > 0) existing.batches.push(batch);
                        existing.min_threshold = this.forms.pantry.min_threshold;
                    } else {
                        this.pantry.push({ id: Date.now(), name: this.forms.pantry.name, category: this.forms.pantry.category, unit: this.forms.pantry.unit || 'Units', min_threshold: this.forms.pantry.min_threshold || 0, batches: batch.qty > 0 ? [batch] : [] });
                    }
                    this.sortBatches();
                    this.forms.pantry = { name: '', qty: 0, min_threshold: 0, unit: '', location: 'Main Pantry', category: 'Other', expiry_date: '' };
                    this.save();
                },

                sortBatches() {
                    this.pantry.forEach(item => item.batches.sort((a,b) => (a.expiry || '9999') > (b.expiry || '9999') ? 1 : -1));
                },

                // --- RECIPES & SHOPPING ---
                addIngToRecipeForm() {
                    if(!this.forms.recipe.ingName) return;
                    let exists = this.pantry.find(p => p.name.toLowerCase() === this.forms.recipe.ingName.toLowerCase());
                    if (!exists) this.pantry.push({ id: Date.now(), name: this.forms.recipe.ingName, category: 'Other', unit: 'Units', min_threshold: 0, batches: [] });
                    this.forms.recipe.tempIngs.push({ name: this.forms.recipe.ingName, qty: parseFloat(this.forms.recipe.ingQty) || 0 });
                    this.forms.recipe.ingName = ''; this.forms.recipe.ingQty = 0;
                    this.save();
                },
                saveRecipe() {
                    if(!this.forms.recipe.title) return;
                    this.recipes.push({ id: Date.now(), title: this.forms.recipe.title, ingredients: [...this.forms.recipe.tempIngs] });
                    this.forms.recipe = { title: '', tempIngs: [], ingName: '', ingQty: 0 };
                    this.save();
                },
                getIngredientStatusClass(name) {
                    const pItem = this.pantry.find(p => p.name.toLowerCase() === name.toLowerCase());
                    return (!pItem || this.getTotalQty(pItem) <= 0) ? 'text-red-400 border-red-100' : 'text-green-600 border-green-100';
                },
                getRecipeName(id) { return this.recipes.find(r => r.id == id)?.title || 'Unknown'; },
                addToPlan() { if(this.forms.plan.recipeId && this.forms.plan.date) { this.mealPlan.push({ id: Date.now(), ...this.forms.plan }); this.save(); }},
                get sortedMealPlan() { return [...this.mealPlan].sort((a,b) => new Date(a.date) - new Date(b.date)); },
                cookMeal(plan) {
                    const recipe = this.recipes.find(r => r.id == plan.recipeId);
                    if (!recipe) return;
                    recipe.ingredients.forEach(ing => {
                        let item = this.pantry.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
                        if(item) {
                            let needed = ing.qty;
                            item.batches.sort((a,b) => (a.expiry || '9999') > (b.expiry || '9999') ? 1 : -1);
                            for (let b of item.batches) {
                                if (needed <= 0) break;
                                if (b.qty <= needed) { needed -= b.qty; b.qty = 0; } 
                                else { b.qty -= needed; needed = 0; }
                            }
                            item.batches = item.batches.filter(b => b.qty > 0);
                        }
                    });
                    this.mealPlan = this.mealPlan.filter(p => p.id !== plan.id);
                    this.save();
                },

                generateShoppingList() {
                    let needs = {};
                    this.mealPlan.forEach(p => {
                        this.recipes.find(r => r.id == p.recipeId)?.ingredients.forEach(i => {
                            needs[i.name.toLowerCase()] = (needs[i.name.toLowerCase()] || 0) + i.qty;
                        });
                    });
                    this.shoppingList = [];
                    this.pantry.forEach(item => {
                        const current = this.getTotalQty(item);
                        const required = Math.max(needs[item.name.toLowerCase()] || 0, item.min_threshold || 0);
                        if (current < required) {
                            this.shoppingList.push({ name: item.name, shortage: required - current, unit: item.unit, category: item.category, location: this.locations[0], boughtExpiry: '' });
                        }
                    });
                },
                get groupedShoppingList() {
                    return this.shoppingList.reduce((acc, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {});
                },
                checkoutItem(shopItem) {
                    let pItem = this.pantry.find(p => p.name.toLowerCase() === shopItem.name.toLowerCase());
                    const batch = { qty: shopItem.shortage, expiry: shopItem.boughtExpiry, location: shopItem.location };
                    if (pItem) { pItem.batches.push(batch); this.sortBatches(); }
                    this.save();
                },

                // --- UTILS ---
                getDaysUntil(d) { return d ? Math.ceil((new Date(d) - new Date().setHours(0,0,0,0)) / 86400000) : 999; },
                getExpiryTextClass(d) { let days = this.getDaysUntil(d); return days < 0 ? 'text-red-600' : (days <= 3 ? 'text-orange-600' : 'text-indigo-400'); },
                getExpiryLabel(d) { let days = this.getDaysUntil(d); if (!d) return 'Stable'; if (days < 0) return 'Expired'; if (days === 0) return 'Today'; return days + 'd'; },
                formatDate(d) { return new Date(d).toLocaleDateString(undefined, {month:'short', day:'numeric'}); },
                formatDateDay(d) { return new Date(d).toLocaleDateString(undefined, {weekday:'short'}); },
                formatDateNum(d) { return new Date(d).getDate(); },
                addLocation() { if(this.newLocName) { this.locations.push(this.newLocName); this.newLocName=''; this.save(); }},
                removeList(list, val) { this[list] = this[list].filter(v => v !== val); this.save(); },
                deleteItem(type, id) { this[type] = this[type].filter(i => i.id !== id); this.save(); }
            }
        }
    </script>
</body>
</html>
