// VitaGuide Admin Webapp
const API_BASE = '/api';
let currentLang = 'de';
let disclaimerLang = 'de';
let editingProduct = null;
let editingRecipe = null;
let editingChip = null;
let aiConfig = null;

// ============ AUTH ============
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch(`${API_BASE}/admin/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem('admin_token', data.token);
            showDashboard();
        } else {
            document.getElementById('login-error').textContent = 'Falsches Passwort';
        }
    } catch (err) {
        document.getElementById('login-error').textContent = 'Verbindungsfehler';
    }
});

function logout() {
    sessionStorage.removeItem('admin_token');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('password').value = '';
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadStats();
    loadProducts();
}

if (sessionStorage.getItem('admin_token')) {
    showDashboard();
}

// ============ API HELPERS ============
async function apiCall(endpoint, options = {}) {
    const token = sessionStorage.getItem('admin_token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };
    
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    return res;
}

// ============ TABS ============
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
    
    switch(tab) {
        case 'products': loadProducts(); break;
        case 'recipes': loadRecipes(); break;
        case 'translations': loadTranslations(); break;
        case 'chips': loadChips(); break;
        case 'disclaimer': loadDisclaimer(); break;
        case 'ai': loadAIConfig(); break;
        case 'clicks': loadClicks(); break;
        case 'logs': loadLogs(); break;
        case 'supplements': loadSupplements(); break;
        case 'videos': loadVideos(); break;
        case 'health-stats': loadHealthStats(); break;
    }
}

// ============ STATS ============
async function loadStats() {
    try {
        const res = await apiCall('/admin/stats');
        const data = await res.json();
        
        document.getElementById('stat-products-de').textContent = data.products_de;
        document.getElementById('stat-products-it').textContent = data.products_it;
        document.getElementById('stat-recipes').textContent = data.recipes;
        document.getElementById('stat-analyses').textContent = data.analyses;
        document.getElementById('stat-clicks').textContent = data.affiliate_clicks;
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ============ PRODUCTS ============
function setProductLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-toggle .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.getElementById('video-url-group').style.display = lang === 'it' ? 'block' : 'none';
    loadProducts();
}

async function loadProducts() {
    const search = document.getElementById('product-search').value;
    try {
        const res = await apiCall(`/admin/products?lang=${currentLang}&search=${encodeURIComponent(search)}`);
        const data = await res.json();
        
        const tbody = document.getElementById('products-table');
        tbody.innerHTML = data.products.map(p => `
            <tr>
                <td>${p.product_id}</td>
                <td>${p.name}</td>
                <td>${p.price || '-'}</td>
                <td>${(p.tags || []).slice(0, 3).join(', ')}</td>
                <td>
                    ${p.label_image 
                        ? '<span style="color:#22C55E"><i class="fas fa-check-circle"></i> Analysiert</span>' 
                        : '<span style="color:#6B7280"><i class="fas fa-minus-circle"></i> Kein Etikett</span>'}
                </td>
                <td>
                    <button class="btn-edit" onclick="editProduct('${p.product_id}')" title="Bearbeiten">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-edit" onclick="openLabelModal('${p.product_id}', '${p.name.replace(/'/g, "\\'")}')" title="Etikett" style="background:#8B5CF6">
                        <i class="fas fa-tag"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteProduct('${p.product_id}')" title="Löschen">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

function searchProducts() { loadProducts(); }

function openProductModal(product = null) {
    editingProduct = product;
    document.getElementById('product-modal-title').textContent = product ? 'Produkt bearbeiten' : 'Neues Produkt';
    document.getElementById('prod-id').value = product?.product_id || '';
    document.getElementById('prod-id').disabled = !!product;
    document.getElementById('prod-name').value = product?.name || '';
    document.getElementById('prod-description').value = product?.description || '';
    document.getElementById('prod-price').value = product?.price || '';
    document.getElementById('prod-rating').value = product?.rating || '';
    document.getElementById('prod-tags').value = (product?.tags || []).join(', ');
    document.getElementById('prod-affiliate-url').value = product?.affiliate_url || '';
    document.getElementById('prod-image-url').value = product?.image_url || '';
    document.getElementById('prod-instructions').value = product?.application_instructions || '';
    document.getElementById('prod-video-url').value = product?.video_url || '';
    document.getElementById('video-url-group').style.display = currentLang === 'it' ? 'block' : 'none';
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    editingProduct = null;
}

async function editProduct(productId) {
    try {
        const res = await apiCall(`/products/${productId}?lang=${currentLang}`);
        const product = await res.json();
        openProductModal(product);
    } catch (err) { alert('Fehler beim Laden'); }
}

async function saveProduct(e) {
    e.preventDefault();
    const productData = {
        product_id: document.getElementById('prod-id').value,
        name: document.getElementById('prod-name').value,
        description: document.getElementById('prod-description').value,
        price: document.getElementById('prod-price').value,
        rating: document.getElementById('prod-rating').value,
        tags: document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        affiliate_url: document.getElementById('prod-affiliate-url').value,
        image_url: document.getElementById('prod-image-url').value,
        application_instructions: document.getElementById('prod-instructions').value,
        video_url: document.getElementById('prod-video-url').value
    };
    
    try {
        const method = editingProduct ? 'PUT' : 'POST';
        const url = editingProduct ? `/admin/products/${editingProduct.product_id}?lang=${currentLang}` : `/admin/products?lang=${currentLang}`;
        const res = await apiCall(url, { method, body: JSON.stringify(productData) });
        if (res.ok) { closeProductModal(); loadProducts(); loadStats(); }
        else { const err = await res.json(); alert(err.detail || 'Fehler'); }
    } catch (err) { alert('Fehler beim Speichern'); }
}

async function deleteProduct(productId) {
    if (!confirm(`Produkt "${productId}" löschen?`)) return;
    try {
        const res = await apiCall(`/admin/products/${productId}?lang=${currentLang}`, { method: 'DELETE' });
        if (res.ok) { loadProducts(); loadStats(); }
    } catch (err) { alert('Fehler'); }
}

// ============ RECIPES ============
async function loadRecipes() {
    const search = document.getElementById('recipe-search').value;
    const category = document.getElementById('recipe-category-filter').value;
    const activeOnly = document.getElementById('recipe-active-filter').value;
    try {
        let url = `/admin/recipes?search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (activeOnly) url += `&active_only=${activeOnly}`;
        const res = await apiCall(url);
        const data = await res.json();

        const catLabels = {
            fruehstueck: 'Frühstück', mittagessen: 'Mittagessen', abendessen: 'Abendessen',
            snack: 'Snack', smoothie: 'Smoothie', suppe: 'Suppe', salat: 'Salat', dessert: 'Dessert'
        };

        const tbody = document.getElementById('recipes-table');
        tbody.innerHTML = data.recipes.map(r => {
            const active = r.active !== false;
            const aiGenerated = r.ai_generated ? '<i class="fas fa-robot" style="color:#8B5CF6;margin-left:4px" title="KI-generiert"></i>' : '';
            return `
            <tr style="${!active ? 'opacity:0.5' : ''}">
                <td><code>${r.id}</code>${aiGenerated}</td>
                <td>${r.de?.title || '-'}</td>
                <td>${r.it?.title || '-'}</td>
                <td><span class="badge">${catLabels[r.category] || r.category || '-'}</span></td>
                <td>${r.time_min} min</td>
                <td>
                    <button onclick="toggleRecipe('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:18px;color:${active ? '#10B981' : '#EF4444'}" title="${active ? 'Deaktivieren' : 'Aktivieren'}">
                        <i class="fas fa-${active ? 'toggle-on' : 'toggle-off'}"></i>
                    </button>
                </td>
                <td>
                    <button class="btn-edit" onclick="editRecipe('${r.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteRecipe('${r.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) { console.error('Error:', err); }
    loadRecipeCategories();
}

async function loadRecipeCategories() {
    try {
        const res = await apiCall('/admin/recipes/categories');
        const data = await res.json();
        const select = document.getElementById('recipe-category-filter');
        const current = select.value;
        const catLabels = {
            fruehstueck: 'Frühstück', mittagessen: 'Mittagessen', abendessen: 'Abendessen',
            snack: 'Snack', smoothie: 'Smoothie', suppe: 'Suppe', salat: 'Salat', dessert: 'Dessert'
        };
        select.innerHTML = '<option value="">Alle Kategorien</option>' +
            data.categories.map(c => `<option value="${c}" ${c === current ? 'selected' : ''}>${catLabels[c] || c}</option>`).join('');
    } catch (err) { console.error('Error loading categories:', err); }
}

async function toggleRecipe(recipeId) {
    try {
        const res = await apiCall(`/admin/recipes/${recipeId}/toggle`, { method: 'PATCH' });
        if (res.ok) loadRecipes();
    } catch (err) { alert('Fehler'); }
}

function searchRecipes() { loadRecipes(); }
function openRecipeModal(recipe = null) {
    editingRecipe = recipe;
    document.getElementById('recipe-modal-title').textContent = recipe ? 'Rezept bearbeiten' : 'Neues Rezept';
    document.getElementById('rec-id').value = recipe?.id || '';
    document.getElementById('rec-id').disabled = !!recipe;
    document.getElementById('rec-time').value = recipe?.time_min || 20;
    document.getElementById('rec-de-title').value = recipe?.de?.title || '';
    document.getElementById('rec-de-ingredients').value = (recipe?.de?.ingredients || []).join('\n');
    document.getElementById('rec-de-steps').value = (recipe?.de?.steps || []).join('\n');
    document.getElementById('rec-it-title').value = recipe?.it?.title || '';
    document.getElementById('rec-it-ingredients').value = (recipe?.it?.ingredients || []).join('\n');
    document.getElementById('rec-it-steps').value = (recipe?.it?.steps || []).join('\n');
    document.getElementById('rec-symptom-tags').value = (recipe?.symptom_tags || []).join(', ');
    document.getElementById('rec-image-url').value = recipe?.image_url || '';
    document.getElementById('recipe-modal').classList.remove('hidden');
}

function closeRecipeModal() { document.getElementById('recipe-modal').classList.add('hidden'); editingRecipe = null; }

async function editRecipe(recipeId) {
    try {
        const res = await apiCall(`/admin/recipes?search=${recipeId}`);
        const data = await res.json();
        const recipe = data.recipes.find(r => r.id === recipeId);
        if (recipe) openRecipeModal(recipe);
    } catch (err) { alert('Fehler'); }
}

async function saveRecipe(e) {
    e.preventDefault();
    const recipeData = {
        id: document.getElementById('rec-id').value,
        time_min: parseInt(document.getElementById('rec-time').value) || 20,
        de: { title: document.getElementById('rec-de-title').value, ingredients: document.getElementById('rec-de-ingredients').value.split('\n').filter(Boolean), steps: document.getElementById('rec-de-steps').value.split('\n').filter(Boolean), tags: [] },
        it: { title: document.getElementById('rec-it-title').value, ingredients: document.getElementById('rec-it-ingredients').value.split('\n').filter(Boolean), steps: document.getElementById('rec-it-steps').value.split('\n').filter(Boolean), tags: [] },
        symptom_tags: document.getElementById('rec-symptom-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        image_url: document.getElementById('rec-image-url').value
    };
    try {
        const method = editingRecipe ? 'PUT' : 'POST';
        const url = editingRecipe ? `/admin/recipes/${editingRecipe.id}` : '/admin/recipes';
        const res = await apiCall(url, { method, body: JSON.stringify(recipeData) });
        if (res.ok) { closeRecipeModal(); loadRecipes(); loadStats(); }
        else { const err = await res.json(); alert(err.detail || 'Fehler'); }
    } catch (err) { alert('Fehler'); }
}

async function deleteRecipe(recipeId) {
    if (!confirm(`Rezept "${recipeId}" löschen?`)) return;
    try { const res = await apiCall(`/admin/recipes/${recipeId}`, { method: 'DELETE' }); if (res.ok) { loadRecipes(); loadStats(); } } catch (err) { alert('Fehler'); }
}

// ============ RECIPE GENERATION ============
function openGenerateModal() {
    document.getElementById('gen-loading').style.display = 'none';
    document.getElementById('gen-result').style.display = 'none';
    document.getElementById('gen-result').innerHTML = '';
    document.getElementById('gen-btn').disabled = false;
    document.getElementById('gen-focus').value = '';
    document.getElementById('generate-modal').classList.remove('hidden');
}

function closeGenerateModal() {
    document.getElementById('generate-modal').classList.add('hidden');
}

async function generateRecipes() {
    const category = document.getElementById('gen-category').value;
    const count = parseInt(document.getElementById('gen-count').value);
    const focus = document.getElementById('gen-focus').value;

    document.getElementById('gen-loading').style.display = 'block';
    document.getElementById('gen-result').style.display = 'none';
    document.getElementById('gen-btn').disabled = true;

    try {
        const res = await apiCall('/admin/recipes/generate', {
            method: 'POST',
            body: JSON.stringify({ category, count, focus })
        });
        const data = await res.json();

        document.getElementById('gen-loading').style.display = 'none';

        if (data.success) {
            const resultHtml = `
                <div style="color:#10B981;margin-bottom:10px">
                    <i class="fas fa-check-circle"></i> <strong>${data.generated} Rezepte generiert!</strong>
                </div>
                ${data.recipes.map(r => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #334155">
                        <span style="color:#E2E8F0">${r.title_de}</span>
                        <code style="font-size:11px;color:#94A3B8">${r.id}</code>
                    </div>
                `).join('')}
            `;
            document.getElementById('gen-result').innerHTML = resultHtml;
            document.getElementById('gen-result').style.display = 'block';
            loadRecipes();
            loadStats();
        } else {
            alert(data.detail || 'Fehler bei der Generierung');
            document.getElementById('gen-btn').disabled = false;
        }
    } catch (err) {
        document.getElementById('gen-loading').style.display = 'none';
        document.getElementById('gen-btn').disabled = false;
        alert('Fehler bei der Rezept-Generierung');
        console.error('Error:', err);
    }
}

// ============ TRANSLATIONS ============
async function loadTranslations() {
    try {
        const res = await apiCall('/settings/translations');
        const data = await res.json();
        const tbody = document.getElementById('translations-table');
        tbody.innerHTML = data.translations.map(t => `
            <tr>
                <td><code>${t.key}</code></td>
                <td>${t.de?.substring(0, 50)}${t.de?.length > 50 ? '...' : ''}</td>
                <td>${t.it?.substring(0, 50)}${t.it?.length > 50 ? '...' : ''}</td>
                <td><button class="btn-edit" onclick="editTranslation('${t.key}', '${encodeURIComponent(t.de)}', '${encodeURIComponent(t.it)}')">Edit</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error('Error:', err); }
}

function editTranslation(key, de, it) {
    document.getElementById('trans-key').value = key;
    document.getElementById('trans-de').value = decodeURIComponent(de);
    document.getElementById('trans-it').value = decodeURIComponent(it);
    document.getElementById('translation-modal').classList.remove('hidden');
}

function closeTranslationModal() { document.getElementById('translation-modal').classList.add('hidden'); }

async function saveTranslation(e) {
    e.preventDefault();
    const key = document.getElementById('trans-key').value;
    const data = { key, de: document.getElementById('trans-de').value, it: document.getElementById('trans-it').value };
    try {
        const res = await apiCall(`/settings/translations/${key}`, { method: 'PUT', body: JSON.stringify(data) });
        if (res.ok) { closeTranslationModal(); loadTranslations(); alert('Gespeichert!'); }
    } catch (err) { alert('Fehler'); }
}

async function resetTranslations() {
    if (!confirm('Alle Übersetzungen auf Standard zurücksetzen?')) return;
    try { await apiCall('/settings/translations/reset', { method: 'POST' }); loadTranslations(); alert('Zurückgesetzt!'); } catch (err) { alert('Fehler'); }
}

// ============ SYMPTOM CHIPS ============
async function loadChips() {
    try {
        const res = await apiCall('/settings/symptom-chips');
        const data = await res.json();
        const tbody = document.getElementById('chips-table');
        tbody.innerHTML = data.chips.map(c => `
            <tr>
                <td><code>${c.id}</code></td>
                <td>${c.de}</td>
                <td>${c.it}</td>
                <td><i class="fas fa-${c.icon || 'circle'}"></i> ${c.icon}</td>
                <td>${c.order}</td>
                <td>
                    <button class="btn-edit" onclick="editChip('${c.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteChip('${c.id}')">Del</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error('Error:', err); }
}

function openChipModal(chip = null) {
    editingChip = chip;
    document.getElementById('chip-modal-title').textContent = chip ? 'Chip bearbeiten' : 'Neuer Symptom-Chip';
    document.getElementById('chip-id').value = chip?.id || '';
    document.getElementById('chip-id').disabled = !!chip;
    document.getElementById('chip-de').value = chip?.de || '';
    document.getElementById('chip-it').value = chip?.it || '';
    document.getElementById('chip-icon').value = chip?.icon || 'circle';
    document.getElementById('chip-order').value = chip?.order || 0;
    document.getElementById('chip-modal').classList.remove('hidden');
}

function closeChipModal() { document.getElementById('chip-modal').classList.add('hidden'); editingChip = null; }

async function editChip(chipId) {
    try {
        const res = await apiCall('/settings/symptom-chips');
        const data = await res.json();
        const chip = data.chips.find(c => c.id === chipId);
        if (chip) openChipModal(chip);
    } catch (err) { alert('Fehler'); }
}

async function saveChip(e) {
    e.preventDefault();
    const chipData = { id: document.getElementById('chip-id').value, de: document.getElementById('chip-de').value, it: document.getElementById('chip-it').value, icon: document.getElementById('chip-icon').value, order: parseInt(document.getElementById('chip-order').value) || 0 };
    try {
        const method = editingChip ? 'PUT' : 'POST';
        const url = editingChip ? `/settings/symptom-chips/${editingChip.id}` : '/settings/symptom-chips';
        const res = await apiCall(url, { method, body: JSON.stringify(chipData) });
        if (res.ok) { closeChipModal(); loadChips(); alert('Gespeichert!'); }
        else { const err = await res.json(); alert(err.detail || 'Fehler'); }
    } catch (err) { alert('Fehler'); }
}

async function deleteChip(chipId) {
    if (!confirm(`Chip "${chipId}" löschen?`)) return;
    try { const res = await apiCall(`/settings/symptom-chips/${chipId}`, { method: 'DELETE' }); if (res.ok) { loadChips(); } } catch (err) { alert('Fehler'); }
}

async function resetChips() {
    if (!confirm('Alle Chips auf Standard zurücksetzen?')) return;
    try { await apiCall('/settings/symptom-chips/reset', { method: 'POST' }); loadChips(); alert('Zurückgesetzt!'); } catch (err) { alert('Fehler'); }
}

// ============ DISCLAIMER ============
function setDisclaimerLang(lang) {
    disclaimerLang = lang;
    document.querySelectorAll('#disclaimer-tab .lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    loadDisclaimer();
}

async function loadDisclaimer() {
    try {
        const res = await apiCall('/settings/disclaimer');
        const data = await res.json();
        const d = data[disclaimerLang];
        
        document.getElementById('disclaimer-form-container').innerHTML = `
            <div class="form-group">
                <label>Titel</label>
                <input type="text" id="disc-title" value="${d.title || ''}">
            </div>
            <div id="disc-items-container">
                ${(d.items || []).map((item, i) => `
                    <div class="form-section" data-index="${i}">
                        <div class="form-row">
                            <div class="form-group" style="flex:2">
                                <label>Überschrift ${i+1}</label>
                                <input type="text" class="disc-item-title" value="${item.title || ''}">
                            </div>
                            <div class="form-group">
                                <label>Icon</label>
                                <input type="text" class="disc-item-icon" value="${item.icon || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Text</label>
                            <textarea class="disc-item-text" rows="2">${item.text || ''}</textarea>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="form-group">
                <label>Button-Text</label>
                <input type="text" id="disc-accept" value="${d.accept_button || ''}">
            </div>
            <button class="btn-save" onclick="saveDisclaimer()"><i class="fas fa-save"></i> Speichern</button>
        `;
    } catch (err) { console.error('Error:', err); }
}

async function saveDisclaimer() {
    const items = [];
    document.querySelectorAll('#disc-items-container .form-section').forEach(section => {
        items.push({
            title: section.querySelector('.disc-item-title').value,
            text: section.querySelector('.disc-item-text').value,
            icon: section.querySelector('.disc-item-icon').value
        });
    });
    
    const data = { lang: disclaimerLang, title: document.getElementById('disc-title').value, items, accept_button: document.getElementById('disc-accept').value };
    try {
        const res = await apiCall(`/settings/disclaimer/${disclaimerLang}`, { method: 'PUT', body: JSON.stringify(data) });
        if (res.ok) alert('Gespeichert!');
    } catch (err) { alert('Fehler'); }
}

async function resetDisclaimer() {
    if (!confirm('Disclaimer auf Standard zurücksetzen?')) return;
    try { await apiCall('/settings/disclaimer/reset', { method: 'POST' }); loadDisclaimer(); alert('Zurückgesetzt!'); } catch (err) { alert('Fehler'); }
}

// ============ AI CONFIG ============
async function loadAIConfig() {
    try {
        const res = await apiCall('/settings/ai-config');
        aiConfig = await res.json();
        
        document.getElementById('ai-provider').value = aiConfig.current.provider;
        updateModelOptions();
        document.getElementById('ai-model').value = aiConfig.current.model;
        
        document.getElementById('ai-status').innerHTML = `
            <div style="background:#1E293B;padding:16px;border-radius:8px;border:1px solid #334155">
                <p style="color:#10B981"><i class="fas fa-check-circle"></i> Aktuelle Konfiguration:</p>
                <p style="color:#F8FAFC;font-size:18px;margin-top:8px"><strong>${aiConfig.current.provider.toUpperCase()}</strong> - ${aiConfig.current.model}</p>
            </div>
        `;
    } catch (err) { console.error('Error:', err); }
}

function updateModelOptions() {
    const provider = document.getElementById('ai-provider').value;
    const modelSelect = document.getElementById('ai-model');
    const models = aiConfig?.available?.[provider] || [];
    
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
}

async function saveAIConfig() {
    const data = { provider: document.getElementById('ai-provider').value, model: document.getElementById('ai-model').value, enabled: true };
    try {
        const res = await apiCall('/settings/ai-config', { method: 'PUT', body: JSON.stringify(data) });
        if (res.ok) { loadAIConfig(); alert('KI-Konfiguration gespeichert!'); }
    } catch (err) { alert('Fehler'); }
}

// ============ CLICKS ============
async function loadClicks() {
    const days = document.getElementById('clicks-period')?.value || 30;
    try {
        const res = await apiCall(`/admin/clicks?days=${days}&limit=50`);
        const data = await res.json();
        
        // Summary
        document.getElementById('clicks-summary').innerHTML = `
            <div style="display:flex;gap:30px;flex-wrap:wrap">
                <div>
                    <div style="font-size:36px;font-weight:700;color:#F8FAFC">${data.total_clicks}</div>
                    <div style="color:#94A3B8">Klicks insgesamt</div>
                </div>
                <div>
                    <div style="font-size:36px;font-weight:700;color:#10B981">${data.by_product?.length || 0}</div>
                    <div style="color:#94A3B8">Verschiedene Produkte</div>
                </div>
                <div>
                    <div style="font-size:36px;font-weight:700;color:#3B82F6">${data.by_country?.length || 0}</div>
                    <div style="color:#94A3B8">Verschiedene Länder</div>
                </div>
            </div>
        `;
        
        // By Country
        document.getElementById('clicks-by-country').innerHTML = (data.by_country || []).map(c => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155">
                <span style="color:#E2E8F0">${c._id || 'Unbekannt'}</span>
                <span style="color:#10B981;font-weight:600">${c.clicks}</span>
            </div>
        `).join('') || '<p style="color:#64748B">Keine Daten</p>';
        
        // By Device
        const deviceIcons = { 'Desktop': 'fa-desktop', 'Mobile': 'fa-mobile-alt', 'Tablet': 'fa-tablet-alt' };
        document.getElementById('clicks-by-device').innerHTML = (data.by_device || []).map(d => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155">
                <span style="color:#E2E8F0"><i class="fas ${deviceIcons[d._id] || 'fa-question'}"></i> ${d._id || 'Unbekannt'}</span>
                <span style="color:#3B82F6;font-weight:600">${d.clicks}</span>
            </div>
        `).join('') || '<p style="color:#64748B">Keine Daten</p>';
        
        // By Browser
        document.getElementById('clicks-by-browser').innerHTML = (data.by_browser || []).map(b => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #334155">
                <span style="color:#E2E8F0">${b._id || 'Unbekannt'}</span>
                <span style="color:#F59E0B;font-weight:600">${b.clicks}</span>
            </div>
        `).join('') || '<p style="color:#64748B">Keine Daten</p>';
        
        // By Hour (Heatmap)
        const hourData = new Array(24).fill(0);
        (data.by_hour || []).forEach(h => { if (h._id !== null) hourData[h._id] = h.clicks; });
        const maxHour = Math.max(...hourData, 1);
        document.getElementById('clicks-by-hour').innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:4px">
                ${hourData.map((clicks, hour) => {
                    const intensity = clicks / maxHour;
                    const bg = clicks > 0 ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` : '#1E293B';
                    return `<div style="width:40px;height:30px;background:${bg};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${clicks > 0 ? '#fff' : '#64748B'}" title="${hour}:00 - ${clicks} Klicks">${hour}h</div>`;
                }).join('')}
            </div>
        `;
        
        // Top Products Table
        document.getElementById('clicks-products-table').innerHTML = (data.by_product || []).map((p, i) => `
            <tr>
                <td><span style="color:${i < 3 ? '#F59E0B' : '#E2E8F0'}">${i < 3 ? '🏆' : ''} ${p.product_name || p._id || 'Unbekannt'}</span></td>
                <td><code>${p._id || '-'}</code></td>
                <td><strong style="color:#10B981">${p.clicks}</strong></td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="color:#64748B">Keine Daten</td></tr>';
        
        // Recent Clicks Table
        document.getElementById('clicks-recent-table').innerHTML = (data.recent_clicks || []).map(click => `
            <tr>
                <td>${click.date || '-'} ${click.time || ''}</td>
                <td>${click.product_name || click.product_id || '-'}</td>
                <td>${click.country || '-'} ${click.region ? `/ ${click.region}` : ''} ${click.city ? `(${click.city})` : ''}</td>
                <td><code style="font-size:11px">${click.ip || '-'}</code></td>
                <td><i class="fas ${click.device_type === 'Mobile' ? 'fa-mobile-alt' : click.device_type === 'Tablet' ? 'fa-tablet-alt' : 'fa-desktop'}"></i> ${click.device_type || '-'}</td>
                <td>${click.browser || '-'}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="color:#64748B">Keine Klicks aufgezeichnet</td></tr>';
        
    } catch (err) { 
        console.error('Error loading clicks:', err);
    }
}

// ============ LOGS ============
async function loadLogs() {
    try {
        const res = await apiCall('/admin/llm-logs?limit=50');
        const data = await res.json();
        document.getElementById('logs-stats').innerHTML = `<h3>LLM Statistiken</h3><p>Aufrufe: <strong>${data.stats?.total_calls || 0}</strong> | Erfolgsrate: <strong>${data.stats?.success_rate || '0%'}</strong> | Ø Latenz: <strong>${data.stats?.avg_latency_ms || 0}ms</strong></p>`;
        const tbody = document.getElementById('logs-table');
        tbody.innerHTML = (data.logs || []).map(log => `<tr><td>${new Date(log.timestamp).toLocaleString('de-DE')}</td><td>${log.endpoint}</td><td>${log.lang}</td><td>${log.latency_ms}ms</td><td style="color:${log.success ? '#10B981' : '#EF4444'}">${log.success ? '✓' : '✗'}</td></tr>`).join('');
    } catch (err) { console.error('Error:', err); }
}


// ============ SUPPLEMENTS ============
async function loadSupplements() {
    try {
        const res = await apiCall('/admin/supplements');
        const data = await res.json();
        const tbody = document.getElementById('supplements-table');
        const timingMap = { morning: 'Morgens', noon: 'Mittags', evening: 'Abends' };
        const evidenceMap = { high: 'Hoch', medium: 'Mittel', exploratory: 'Explorativ' };
        const categoryMap = { vitamin: 'Vitamin', mineral: 'Mineral', fatty_acid: 'Fettsaeure', antioxidant: 'Antioxidans', probiotic: 'Probiotikum', adaptogen: 'Adaptogen' };
        tbody.innerHTML = data.map(s => {
            const active = s.active !== false;
            return `<tr style="${!active ? 'opacity:0.5' : ''}">
                <td><code>${s.id}</code></td>
                <td><strong>${s.name_de}</strong><br><small style="color:#888">${s.name_it}</small></td>
                <td><span class="badge">${categoryMap[s.category] || s.category}</span></td>
                <td>${s.dosage_default.amount} ${s.dosage_default.unit}<br><small>Hoch: ${s.dosage_high_risk.amount} ${s.dosage_high_risk.unit}</small></td>
                <td>${timingMap[s.timing] || s.timing}</td>
                <td><span class="badge ${s.evidence_level === 'high' ? 'badge-success' : s.evidence_level === 'medium' ? 'badge-warning' : 'badge-info'}">${evidenceMap[s.evidence_level] || s.evidence_level}</span></td>
                <td><span style="color:${active ? '#10B981' : '#EF4444'}">${active ? 'Aktiv' : 'Inaktiv'}</span></td>
                <td>
                    <button class="btn-edit" onclick="editSupplement('${s.id}', ${JSON.stringify(s).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
                    <button class="btn-edit" onclick="toggleSupplement('${s.id}', ${!active})" title="${active ? 'Deaktivieren' : 'Aktivieren'}"><i class="fas fa-${active ? 'toggle-on' : 'toggle-off'}"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) { console.error('Error:', err); }
}

async function toggleSupplement(id, active) {
    try {
        await apiCall(`/admin/supplements/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ active })
        });
        loadSupplements();
    } catch (err) { console.error('Error:', err); }
}

function editSupplement(id, data) {
    const newDosage = prompt(`Standard-Dosierung fuer ${data.name_de} (aktuell: ${data.dosage_default.amount} ${data.dosage_default.unit}):`, data.dosage_default.amount);
    if (newDosage === null) return;
    const newHighDosage = prompt(`Hoch-Risiko-Dosierung (aktuell: ${data.dosage_high_risk.amount} ${data.dosage_high_risk.unit}):`, data.dosage_high_risk.amount);
    if (newHighDosage === null) return;
    const newTiming = prompt('Einnahmezeitpunkt (morning/noon/evening):', data.timing);
    if (newTiming === null) return;

    apiCall(`/admin/supplements/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            dosage_default: { ...data.dosage_default, amount: parseFloat(newDosage) },
            dosage_high_risk: { ...data.dosage_high_risk, amount: parseFloat(newHighDosage) },
            timing: newTiming
        })
    }).then(() => loadSupplements()).catch(err => console.error('Error:', err));
}

// ============ VIDEOS ============
let videoLang = 'de';
let editingVideo = null;

function setVideoLang(lang) {
    videoLang = lang;
    document.querySelectorAll('#videos-tab .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    loadVideos();
}

async function loadVideos() {
    try {
        const categoryFilter = document.getElementById('video-category-filter').value;
        let url = `/videos?lang=${videoLang}&active_only=false`;
        if (categoryFilter) url += `&category=${categoryFilter}`;
        
        const res = await apiCall(url);
        const videos = await res.json();
        
        const tbody = document.getElementById('videos-table');
        tbody.innerHTML = videos.map(v => `
            <tr>
                <td>
                    <img src="https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg" 
                         alt="${v.title}" 
                         style="width:120px;height:68px;border-radius:6px;object-fit:cover">
                </td>
                <td>
                    <a href="${v.youtube_url}" target="_blank" style="color:#60A5FA">${v.title}</a>
                    <div style="font-size:12px;color:#94A3B8;margin-top:4px">${v.description || ''}</div>
                </td>
                <td>${getCategoryLabel(v.category)}</td>
                <td><span class="lang-badge">${v.lang.toUpperCase()}</span></td>
                <td>${v.duration || '-'}</td>
                <td>
                    <button class="btn-edit" onclick='editVideo(${JSON.stringify(v)})'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteVideo('${v.video_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading videos:', err);
    }
}

function getCategoryLabel(cat) {
    const labels = {
        'articolazioni': 'Gelenke',
        'digestione': 'Verdauung',
        'peso': 'Gewicht',
        'cuore': 'Herz',
        'energia': 'Energie',
        'pelle': 'Haut & Haare',
        'immunsystem': 'Immunsystem',
        'schlaf': 'Schlaf',
        'memoria': 'Gedächtnis',
        'allgemein': 'Allgemein'
    };
    return labels[cat] || cat;
}

function openVideoModal(video = null) {
    editingVideo = video;
    document.getElementById('video-modal-title').textContent = video ? 'Video bearbeiten' : 'Neues Video';
    
    document.getElementById('video-title').value = video?.title || '';
    document.getElementById('video-youtube-url').value = video?.youtube_url || '';
    document.getElementById('video-youtube-id').value = video?.youtube_id || '';
    document.getElementById('video-description').value = video?.description || '';
    document.getElementById('video-category').value = video?.category || 'allgemein';
    document.getElementById('video-lang').value = video?.lang || videoLang;
    document.getElementById('video-duration').value = video?.duration || '';
    document.getElementById('video-order').value = video?.sort_order || 0;
    document.getElementById('video-tags').value = (video?.tags || []).join(', ');
    
    document.getElementById('video-modal').classList.remove('hidden');
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.add('hidden');
    editingVideo = null;
}

function editVideo(video) {
    openVideoModal(video);
}

async function saveVideo(e) {
    e.preventDefault();
    
    const videoData = {
        title: document.getElementById('video-title').value,
        youtube_url: document.getElementById('video-youtube-url').value,
        youtube_id: document.getElementById('video-youtube-id').value,
        description: document.getElementById('video-description').value,
        category: document.getElementById('video-category').value,
        lang: document.getElementById('video-lang').value,
        duration: document.getElementById('video-duration').value,
        sort_order: parseInt(document.getElementById('video-order').value) || 0,
        tags: document.getElementById('video-tags').value.split(',').map(t => t.trim()).filter(Boolean)
    };
    
    try {
        if (editingVideo) {
            await apiCall(`/videos/${editingVideo.video_id}`, {
                method: 'PUT',
                body: JSON.stringify(videoData)
            });
        } else {
            await apiCall('/videos', {
                method: 'POST',
                body: JSON.stringify(videoData)
            });
        }
        closeVideoModal();
        loadVideos();
    } catch (err) {
        console.error('Error saving video:', err);
        alert('Fehler beim Speichern');
    }
}

async function deleteVideo(videoId) {
    if (!confirm('Video wirklich löschen?')) return;
    
    try {
        await apiCall(`/videos/${videoId}`, { method: 'DELETE' });
        loadVideos();
    } catch (err) {
        console.error('Error deleting video:', err);
    }
}

// ============ LABEL ANALYSIS ============
let currentLabelProductId = null;
let selectedLabelFile = null;
let selectedPdfFile = null;

async function openLabelModal(productId, productName) {
    currentLabelProductId = productId;
    selectedLabelFile = null;
    selectedPdfFile = null;
    
    document.getElementById('label-product-id').value = productId;
    document.getElementById('label-product-name').value = productName;
    document.getElementById('label-file-input').value = '';
    document.getElementById('label-pdf-input').value = '';
    document.getElementById('label-file-preview').style.display = 'none';
    document.getElementById('label-pdf-preview').style.display = 'none';
    document.getElementById('label-analyze-btn').disabled = true;
    document.getElementById('label-loading').style.display = 'none';
    document.getElementById('label-image-preview').style.display = 'none';
    document.getElementById('label-pdf-link').style.display = 'none';
    
    // Load existing label data
    try {
        const res = await apiCall(`/products/${productId}/label`);
        const data = await res.json();
        
        if (data.label_image || data.label_pdf || data.analysis) {
            document.getElementById('label-current').style.display = 'block';
            
            if (data.label_image) {
                document.getElementById('label-image-preview').src = data.label_image;
                document.getElementById('label-image-preview').style.display = 'block';
            }
            
            if (data.label_pdf) {
                document.getElementById('label-pdf-href').href = data.label_pdf;
                document.getElementById('label-pdf-link').style.display = 'block';
            }
            
            if (data.analysis) {
                const a = data.analysis;
                let html = '<div style="font-size:13px">';
                if (a.dosage) html += `<p><strong>Dosierung:</strong> ${a.dosage}</p>`;
                if (a.intake_recommendation) html += `<p><strong>Einnahme:</strong> ${a.intake_recommendation}</p>`;
                if (a.ingredients && a.ingredients.length) {
                    html += `<p><strong>Inhaltsstoffe:</strong></p><ul style="margin:5px 0 10px 20px">`;
                    a.ingredients.slice(0, 5).forEach(i => html += `<li>${i}</li>`);
                    if (a.ingredients.length > 5) html += `<li>... +${a.ingredients.length - 5} weitere</li>`;
                    html += '</ul>';
                }
                if (a.warnings && a.warnings.length) {
                    html += `<p style="color:#F59E0B"><strong>Warnhinweise:</strong></p><ul style="margin:5px 0 10px 20px">`;
                    a.warnings.forEach(w => html += `<li>${w}</li>`);
                    html += '</ul>';
                }
                html += '</div>';
                document.getElementById('label-analysis-display').innerHTML = html;
            }
        } else {
            document.getElementById('label-current').style.display = 'none';
        }
    } catch (err) {
        document.getElementById('label-current').style.display = 'none';
    }
    
    document.getElementById('label-modal').classList.remove('hidden');
}

function closeLabelModal() {
    document.getElementById('label-modal').classList.add('hidden');
    currentLabelProductId = null;
    selectedLabelFile = null;
    selectedPdfFile = null;
}

function updateAnalyzeButton() {
    document.getElementById('label-analyze-btn').disabled = !(selectedLabelFile || selectedPdfFile);
}

function previewLabelFile() {
    const fileInput = document.getElementById('label-file-input');
    const file = fileInput.files[0];
    
    if (file) {
        selectedLabelFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('label-new-preview').src = e.target.result;
            document.getElementById('label-file-name').textContent = file.name;
            document.getElementById('label-file-preview').style.display = 'block';
            updateAnalyzeButton();
        };
        reader.readAsDataURL(file);
    }
}

function previewPdfFile() {
    const fileInput = document.getElementById('label-pdf-input');
    const file = fileInput.files[0];
    
    if (file) {
        selectedPdfFile = file;
        document.getElementById('label-pdf-name').textContent = file.name;
        document.getElementById('label-pdf-preview').style.display = 'block';
        updateAnalyzeButton();
    }
}

async function analyzeLabel() {
    if ((!selectedLabelFile && !selectedPdfFile) || !currentLabelProductId) return;
    
    document.getElementById('label-loading').style.display = 'block';
    document.getElementById('label-analyze-btn').disabled = true;
    
    const formData = new FormData();
    if (selectedLabelFile) formData.append('file', selectedLabelFile);
    if (selectedPdfFile) formData.append('pdf_file', selectedPdfFile);
    formData.append('lang', currentLang);
    
    try {
        const res = await fetch(`${API_BASE}/products/${currentLabelProductId}/label`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}`
            },
            body: formData
        });
        
        if (res.ok) {
            const data = await res.json();
            alert('Etikett erfolgreich analysiert!');
            closeLabelModal();
            loadProducts();
        } else {
            const err = await res.json();
            alert('Fehler: ' + (err.detail || 'Analyse fehlgeschlagen'));
        }
    } catch (err) {
        console.error('Label analysis error:', err);
        alert('Fehler bei der Analyse');
    } finally {
        document.getElementById('label-loading').style.display = 'none';
        document.getElementById('label-analyze-btn').disabled = false;
    }
}

async function deleteLabel() {
    if (!confirm('Etikett-Daten wirklich löschen?')) return;
    
    try {
        await apiCall(`/products/${currentLabelProductId}/label`, { method: 'DELETE' });
        alert('Etikett gelöscht');
        closeLabelModal();
        loadProducts();
    } catch (err) {
        console.error('Delete label error:', err);
        alert('Fehler beim Löschen');
    }
}

// ============ HEALTH STATISTICS ============
const LABEL_MAP = {
    // Gender
    male: 'Männlich', female: 'Weiblich', diverse: 'Divers', unbekannt: 'Unbekannt',
    // Diet
    omnivore: 'Allesfresser', vegetarian: 'Vegetarisch', vegan: 'Vegan',
    pescetarian: 'Pescetarisch', keto: 'Ketogen', paleo: 'Paleo', low_carb: 'Low Carb',
    // Activity
    sedentary: 'Sitzend', light: 'Leicht', moderate: 'Moderat',
    active: 'Aktiv', very_active: 'Sehr aktiv', professional_athlete: 'Profi-Sportler',
    // Complaints
    fatigue: 'Müdigkeit', headache: 'Kopfschmerzen', digestive: 'Verdauung',
    joint_pain: 'Gelenkschmerzen', muscle_pain: 'Muskelschmerzen',
    skin_problems: 'Hautprobleme', hair_loss: 'Haarausfall',
    concentration: 'Konzentration', mood_swings: 'Stimmung',
    anxiety_symptoms: 'Angst', sleep_problems: 'Schlafprobleme',
    weight_issues: 'Gewicht', immune_weakness: 'Immunschwäche',
    cold_hands_feet: 'Kalte Hände/Füße',
    // Conditions
    diabetes: 'Diabetes', hypothyroidism: 'Schilddrüsenunterfkt.', hashimoto: 'Hashimoto',
    osteoporosis: 'Osteoporose', anemia: 'Anämie', ibs: 'Reizdarm',
    depression: 'Depression', anxiety: 'Angststörung', migraine: 'Migräne',
    pcos: 'PCOS', high_blood_pressure: 'Bluthochdruck', heart_disease: 'Herzkrankheit',
    // Medications
    ppi: 'Magensäureblocker', metformin: 'Metformin', statins: 'Statine',
    blood_thinners: 'Blutverdünner', diuretics: 'Diuretika', antacids: 'Antazida',
    birth_control: 'Verhütungspille', antidepressants: 'Antidepressiva',
    antibiotics: 'Antibiotika', thyroid_medication: 'Schilddrüsenmed.',
    // Deficiencies
    vitamin_d: 'Vitamin D', vitamin_b12: 'Vitamin B12', iron: 'Eisen',
    magnesium: 'Magnesium', zinc: 'Zink', folate: 'Folsäure',
    omega3: 'Omega-3', calcium: 'Calcium',
    // Sleep issues
    falling_asleep: 'Einschlafen', staying_asleep: 'Durchschlafen',
    early_waking: 'Frühes Aufwachen', not_rested: 'Nicht erholt',
    // Stress types
    work: 'Beruflich', private: 'Privat', financial: 'Finanziell', health: 'Gesundheitlich',
    // Age buckets
    '0': '<18', '18': '18-24', '25': '25-34', '35': '35-44', '45': '45-54', '55': '55-64', '65': '65+',
    // BMI buckets
    '0.0': '<18.5 (Untergewicht)', '18.5': '18.5-24.9 (Normal)', '25.0': '25-29.9 (Übergewicht)', '30.0': '30-34.9 (Adipositas I)', '35.0': '35+ (Adipositas II+)',
};

function getLabel(key) {
    // Handle both string and numeric keys, and float keys for BMI
    return LABEL_MAP[key] || LABEL_MAP[String(key)] || LABEL_MAP[parseFloat(key)?.toFixed(1)] || key || 'Unbekannt';
}

function renderBar(label, count, total, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:140px;font-size:13px;color:#CBD5E1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${label}">${label}</div>
        <div style="flex:1;background:#1E293B;border-radius:6px;height:22px;position:relative;overflow:hidden">
            <div style="width:${pct}%;background:${color};height:100%;border-radius:6px;transition:width 0.5s"></div>
        </div>
        <div style="width:60px;font-size:12px;color:#94A3B8;text-align:right">${count} (${pct}%)</div>
    </div>`;
}

function renderDistribution(container, data, total, color) {
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:#475569;font-size:13px">Keine Daten</p>';
        return;
    }
    container.innerHTML = data.map(d => renderBar(getLabel(d.label), d.count, total, color)).join('');
}

async function loadHealthStats() {
    const loadingEl = document.getElementById('health-stats-loading');
    const emptyEl = document.getElementById('health-stats-empty');
    const contentEl = document.getElementById('health-stats-content');

    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    contentEl.style.display = 'none';

    try {
        const res = await apiCall('/admin/health-stats');
        const d = await res.json();

        loadingEl.style.display = 'none';

        if (d.total_profiles === 0) {
            emptyEl.style.display = 'block';
            return;
        }

        contentEl.style.display = 'block';
        const total = d.total_profiles;

        // Summary Cards
        const sleep = d.sleep || {};
        const stress = d.stress || {};
        document.getElementById('health-summary-cards').innerHTML = `
            <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Profile gesamt</div></div>
            <div class="stat-card"><div class="stat-value">${sleep.avg_quality ? sleep.avg_quality.toFixed(1) : '-'}/10</div><div class="stat-label">Schlafqualität Ø</div></div>
            <div class="stat-card"><div class="stat-value">${sleep.avg_duration ? sleep.avg_duration.toFixed(1) : '-'}h</div><div class="stat-label">Schlafdauer Ø</div></div>
            <div class="stat-card"><div class="stat-value">${stress.avg_stress ? stress.avg_stress.toFixed(1) : '-'}/10</div><div class="stat-label">Stresslevel Ø</div></div>
            <div class="stat-card"><div class="stat-value">${stress.avg_energy ? stress.avg_energy.toFixed(1) : '-'}/10</div><div class="stat-label">Energielevel Ø</div></div>
        `;

        // Distributions
        renderDistribution(document.getElementById('hs-gender'), d.gender, total, '#4A8B71');
        renderDistribution(document.getElementById('hs-age'), d.age, total, '#2C5F78');
        renderDistribution(document.getElementById('hs-diet'), d.diet, total, '#6B4E8B');
        renderDistribution(document.getElementById('hs-activity'), d.activity, total, '#D97706');
        renderDistribution(document.getElementById('hs-bmi'), d.bmi, total, '#0891B2');

        // Sleep & Stress details
        const sleepStressEl = document.getElementById('hs-sleep-stress');
        let ssHtml = '<p style="color:#CBD5E1;font-size:13px;margin-bottom:10px;font-weight:600">Schlafprobleme:</p>';
        ssHtml += (d.sleep_issues || []).map(s => renderBar(getLabel(s.label), s.count, total, '#6366F1')).join('');
        ssHtml += '<p style="color:#CBD5E1;font-size:13px;margin:12px 0 10px;font-weight:600">Stressquellen:</p>';
        ssHtml += (d.stress_types || []).map(s => renderBar(getLabel(s.label), s.count, total, '#EF4444')).join('');
        sleepStressEl.innerHTML = ssHtml;

        // Complaints (with intensity)
        const complaintsEl = document.getElementById('hs-complaints');
        if (d.complaints && d.complaints.length > 0) {
            complaintsEl.innerHTML = d.complaints.map(c => {
                const pct = Math.round((c.count / total) * 100);
                const intensityColor = c.avg_intensity > 7 ? '#EF4444' : c.avg_intensity > 4 ? '#D97706' : '#4A8B71';
                return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                    <div style="width:140px;font-size:13px;color:#CBD5E1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${getLabel(c.label)}</div>
                    <div style="flex:1;background:#1E293B;border-radius:6px;height:22px;position:relative;overflow:hidden">
                        <div style="width:${pct}%;background:#D97706;height:100%;border-radius:6px"></div>
                    </div>
                    <div style="width:80px;font-size:11px;color:#94A3B8;text-align:right">${c.count}x ${c.avg_intensity ? '(Ø' + c.avg_intensity + ')' : ''}</div>
                </div>`;
            }).join('');
        } else {
            complaintsEl.innerHTML = '<p style="color:#475569;font-size:13px">Keine Daten</p>';
        }

        renderDistribution(document.getElementById('hs-deficiencies'), d.deficiencies, total, '#EF4444');
        renderDistribution(document.getElementById('hs-conditions'), d.conditions, total, '#F59E0B');
        renderDistribution(document.getElementById('hs-medications'), d.medications, total, '#8B5CF6');

    } catch (err) {
        console.error('Error loading health stats:', err);
        loadingEl.style.display = 'none';
        emptyEl.style.display = 'block';
    }
}


// ==================== SHOP IMPORT ====================

let shopPreviewData = [];

// Load sync configs on tab switch
async function loadSyncConfigs() {
    try {
        const resp = await fetch(`${API_BASE}/admin/sync-config`);
        const data = await resp.json();

        for (const lang of ['de', 'it']) {
            const config = data[lang];
            const enabledEl = document.getElementById(`sync-${lang}-enabled`);
            const urlEl = document.getElementById(`sync-${lang}-url`);
            const intervalEl = document.getElementById(`sync-${lang}-interval`);
            const statusEl = document.getElementById(`sync-${lang}-status`);
            const toggleEl = document.querySelector(`.sync-toggle[data-lang="${lang}"]`);

            if (config) {
                enabledEl.checked = config.enabled || false;
                if (config.shop_url) urlEl.value = config.shop_url;
                if (config.interval) intervalEl.value = config.interval;

                // Update toggle visual
                toggleEl.style.background = config.enabled ? '#4ADE80' : '#334155';

                // Build status text
                let statusParts = [];
                if (config.last_sync) {
                    const d = new Date(config.last_sync);
                    statusParts.push(`Letzter Sync: ${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})}`);
                }
                if (config.last_sync_result) {
                    const r = config.last_sync_result;
                    statusParts.push(`(${r.imported} neu, ${r.updated} aktualisiert, ${r.removed} entfernt)`);
                }
                if (config.next_sync && config.enabled) {
                    const nd = new Date(config.next_sync);
                    statusParts.push(`Naechster Sync: ${nd.toLocaleDateString('de-DE')}`);
                }
                statusEl.textContent = statusParts.join(' | ') || (config.enabled ? 'Aktiv - wartet auf naechsten Sync' : 'Deaktiviert');
            } else {
                toggleEl.style.background = '#334155';
                statusEl.textContent = 'Noch nicht konfiguriert';
            }
        }
    } catch (err) {
        console.error('Failed to load sync configs:', err);
    }
}

async function saveSyncConfig(lang) {
    const url = document.getElementById(`sync-${lang}-url`).value.trim();
    const interval = document.getElementById(`sync-${lang}-interval`).value;
    const enabled = document.getElementById(`sync-${lang}-enabled`).checked;
    const toggleEl = document.querySelector(`.sync-toggle[data-lang="${lang}"]`);

    toggleEl.style.background = enabled ? '#4ADE80' : '#334155';

    if (!url) return;

    try {
        const resp = await fetch(`${API_BASE}/admin/sync-config`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({lang, shop_url: url, interval, enabled})
        });
        if (!resp.ok) throw new Error('Fehler beim Speichern');
        loadSyncConfigs();
    } catch (err) {
        alert('Fehler: ' + err.message);
    }
}

async function triggerSyncNow(lang) {
    const btn = document.getElementById(`sync-${lang}-btn`);
    const url = document.getElementById(`sync-${lang}-url`).value.trim();
    if (!url) { alert('Bitte zuerst eine Shop-URL eingeben'); return; }

    // Save config first
    await saveSyncConfig(lang);

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sync laeuft...';

    try {
        const resp = await fetch(`${API_BASE}/admin/sync-now/${lang}`, {method: 'POST'});
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Sync fehlgeschlagen');

        const jobId = data.job_id;

        // Show progress section
        document.getElementById('shop-import-progress').style.display = 'block';
        document.getElementById('import-progress-title').textContent = `Sync ${lang.toUpperCase()} laeuft...`;
        document.getElementById('import-progress-bar').style.width = '5%';
        document.getElementById('import-progress-bar').style.background = 'linear-gradient(90deg,#4A8B71,#5B9F82)';
        document.getElementById('import-progress-bar').textContent = '';
        document.getElementById('import-progress-stats').textContent = '';
        document.getElementById('shop-import-results').style.display = 'none';

        // Poll status
        const poll = setInterval(async () => {
            try {
                const statusResp = await fetch(`${API_BASE}/admin/shop-import/status/${jobId}`);
                const status = await statusResp.json();

                const pct = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 5;
                document.getElementById('import-progress-bar').style.width = pct + '%';
                document.getElementById('import-progress-bar').textContent = pct + '%';
                document.getElementById('import-progress-title').textContent =
                    status.status === 'complete' ? `Sync ${lang.toUpperCase()} abgeschlossen!` :
                    status.status === 'error' ? 'Sync fehlgeschlagen' :
                    `Sync: ${status.current_product || '...'}`;
                document.getElementById('import-progress-stats').textContent =
                    `${status.processed} / ${status.total} | ${status.imported} neu | ${status.updated || 0} aktualisiert | ${status.removed || 0} entfernt | ${status.skipped} uebersprungen`;

                if (status.status === 'complete' || status.status === 'error') {
                    clearInterval(poll);
                    document.getElementById('import-progress-bar').style.width = '100%';
                    document.getElementById('import-progress-bar').textContent = '100%';

                    if (status.status === 'error') {
                        document.getElementById('import-progress-bar').style.background = '#F87171';
                    }

                    // Show results card
                    const resultsDiv = document.getElementById('shop-import-results');
                    document.getElementById('import-results-stats').innerHTML = `
                        <div style="background:#0F172A;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#E2E8F0">${status.total}</div>
                            <div style="font-size:12px;color:#94A3B8">Gesamt</div>
                        </div>
                        <div style="background:#0F172A;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#4ADE80">${status.imported}</div>
                            <div style="font-size:12px;color:#94A3B8">Neu</div>
                        </div>
                        <div style="background:#0F172A;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#38BDF8">${status.updated || 0}</div>
                            <div style="font-size:12px;color:#94A3B8">Aktualisiert</div>
                        </div>
                        <div style="background:#0F172A;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#F87171">${status.removed || 0}</div>
                            <div style="font-size:12px;color:#94A3B8">Entfernt</div>
                        </div>
                        <div style="background:#0F172A;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#F59E0B">${status.skipped}</div>
                            <div style="font-size:12px;color:#94A3B8">Uebersprungen</div>
                        </div>
                    `;

                    if (status.errors.length > 0) {
                        document.getElementById('import-results-errors').style.display = 'block';
                        document.getElementById('import-errors-list').innerHTML = status.errors.map(e => `<li>${e}</li>`).join('');
                    } else {
                        document.getElementById('import-results-errors').style.display = 'none';
                    }

                    resultsDiv.style.display = 'block';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-play"></i> Jetzt synchronisieren';

                    loadSyncConfigs();
                    if (typeof loadProducts === 'function') loadProducts(lang);
                }
            } catch (pollErr) {
                console.error('Poll error:', pollErr);
            }
        }, 3000);

    } catch (err) {
        alert('Sync-Fehler: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Jetzt synchronisieren';
    }
}

// Load sync configs when shop-import tab is shown
const origSwitchTab = window.switchTab;
window.switchTab = function(tab) {
    origSwitchTab(tab);
    if (tab === 'shop-import') loadSyncConfigs();
};

async function previewShop() {
    const url = document.getElementById('shop-import-url').value.trim();
    const lang = document.getElementById('shop-import-lang').value;
    if (!url) { alert('Bitte Shop-URL eingeben'); return; }

    const btn = document.getElementById('shop-preview-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lade...';

    // Hide previous results
    document.getElementById('shop-import-results').style.display = 'none';
    document.getElementById('shop-import-progress').style.display = 'none';

    try {
        const resp = await fetch(`${API_BASE}/admin/shop-import/preview`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({shop_url: url, lang})
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Fehler beim Laden');

        shopPreviewData = data.products || [];
        document.getElementById('shop-preview-count').textContent = data.total;

        const tbody = document.getElementById('shop-preview-table');
        tbody.innerHTML = shopPreviewData.map(p => `
            <tr style="border-bottom:1px solid #1E293B">
                <td style="padding:8px 16px">
                    ${p.image ? `<img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">` : '<div style="width:40px;height:40px;background:#1E293B;border-radius:4px"></div>'}
                </td>
                <td style="padding:8px 16px;color:#E2E8F0;font-size:13px">${p.title}</td>
                <td style="padding:8px 16px;color:#94A3B8;font-size:12px">${p.product_type || '-'}</td>
                <td style="padding:8px 16px;color:#4ADE80;font-size:13px">${p.price ? p.price + ' EUR' : '-'}</td>
                <td style="padding:8px 16px">
                    ${(p.tags || []).slice(0,3).map(t => `<span style="background:#1E293B;color:#94A3B8;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px">${t}</span>`).join('')}
                </td>
            </tr>
        `).join('');

        document.getElementById('shop-preview-container').style.display = 'block';
        document.getElementById('shop-import-btn').disabled = false;

    } catch (err) {
        alert('Fehler: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-eye"></i> Vorschau';
    }
}

async function startShopImport() {
    const url = document.getElementById('shop-import-url').value.trim();
    const lang = document.getElementById('shop-import-lang').value;
    if (!url) { alert('Bitte Shop-URL eingeben'); return; }

    if (!confirm(`${shopPreviewData.length} Produkte importieren?\n\nDie KI analysiert jedes Produkt - dies kann einige Minuten dauern.`)) return;

    const btn = document.getElementById('shop-import-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Import laeuft...';

    // Show progress
    const progressDiv = document.getElementById('shop-import-progress');
    progressDiv.style.display = 'block';
    document.getElementById('import-progress-title').textContent = 'Import wird gestartet...';
    document.getElementById('import-progress-bar').style.width = '5%';
    document.getElementById('import-progress-bar').style.background = 'linear-gradient(90deg,#4A8B71,#5B9F82)';
    document.getElementById('import-progress-bar').textContent = '';
    document.getElementById('import-progress-stats').textContent = '';
    document.getElementById('shop-import-results').style.display = 'none';

    try {
        // Start background import
        const resp = await fetch(`${API_BASE}/admin/shop-import`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({shop_url: url, lang})
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Import fehlgeschlagen');

        const jobId = data.job_id;

        // Poll status
        const poll = setInterval(async () => {
            try {
                const statusResp = await fetch(`${API_BASE}/admin/shop-import/status/${jobId}`);
                const status = await statusResp.json();

                const pct = status.total > 0 ? Math.round((status.processed / status.total) * 100) : 5;
                document.getElementById('import-progress-bar').style.width = pct + '%';
                document.getElementById('import-progress-bar').textContent = pct + '%';
                document.getElementById('import-progress-title').textContent =
                    status.status === 'complete' ? 'Import abgeschlossen!' :
                    status.status === 'error' ? 'Import fehlgeschlagen' :
                    `KI analysiert: ${status.current_product || '...'}`;
                document.getElementById('import-progress-stats').textContent =
                    `${status.processed} / ${status.total} verarbeitet | ${status.imported} importiert | ${status.skipped} uebersprungen`;

                if (status.status === 'complete' || status.status === 'error') {
                    clearInterval(poll);
                    document.getElementById('import-progress-bar').style.width = '100%';
                    document.getElementById('import-progress-bar').textContent = '100%';

                    if (status.status === 'error') {
                        document.getElementById('import-progress-bar').style.background = '#F87171';
                    }

                    // Show results
                    const resultsDiv = document.getElementById('shop-import-results');
                    document.getElementById('import-results-stats').innerHTML = `
                        <div style="background:#1E293B;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#E2E8F0">${status.total}</div>
                            <div style="font-size:12px;color:#94A3B8">Gesamt</div>
                        </div>
                        <div style="background:#1E293B;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#4ADE80">${status.imported}</div>
                            <div style="font-size:12px;color:#94A3B8">Importiert</div>
                        </div>
                        <div style="background:#1E293B;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#F59E0B">${status.skipped}</div>
                            <div style="font-size:12px;color:#94A3B8">Uebersprungen</div>
                        </div>
                        <div style="background:#1E293B;padding:16px;border-radius:8px;text-align:center">
                            <div style="font-size:28px;font-weight:700;color:#F87171">${status.errors.length}</div>
                            <div style="font-size:12px;color:#94A3B8">Fehler</div>
                        </div>
                    `;

                    if (status.errors.length > 0) {
                        document.getElementById('import-results-errors').style.display = 'block';
                        document.getElementById('import-errors-list').innerHTML = status.errors.map(e => `<li>${e}</li>`).join('');
                    } else {
                        document.getElementById('import-results-errors').style.display = 'none';
                    }

                    resultsDiv.style.display = 'block';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-download"></i> Importieren';

                    if (typeof loadProducts === 'function') loadProducts(lang);
                }
            } catch (pollErr) {
                console.error('Poll error:', pollErr);
            }
        }, 3000);

    } catch (err) {
        document.getElementById('import-progress-title').textContent = 'Import fehlgeschlagen';
        document.getElementById('import-progress-bar').style.width = '100%';
        document.getElementById('import-progress-bar').style.background = '#F87171';
        document.getElementById('import-progress-bar').textContent = 'Fehler';
        alert('Import-Fehler: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> Importieren';
    }
}
