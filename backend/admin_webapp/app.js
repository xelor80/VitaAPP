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
                    <button class="btn-edit" onclick="editProduct('${p.product_id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteProduct('${p.product_id}')">Del</button>
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
    try {
        const res = await apiCall(`/admin/recipes?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        
        const tbody = document.getElementById('recipes-table');
        tbody.innerHTML = data.recipes.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.de?.title || '-'}</td>
                <td>${r.it?.title || '-'}</td>
                <td>${r.time_min} min</td>
                <td>
                    <button class="btn-edit" onclick="editRecipe('${r.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteRecipe('${r.id}')">Del</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error('Error:', err); }
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
    try {
        const res = await apiCall('/admin/clicks?days=30');
        const data = await res.json();
        document.getElementById('clicks-summary').innerHTML = `<h3>Affiliate-Klicks (letzte ${data.period_days} Tage)</h3><p><strong>${data.total_clicks}</strong> Klicks insgesamt</p>`;
        const tbody = document.getElementById('clicks-table');
        tbody.innerHTML = (data.by_product || []).map(item => `<tr><td>${item._id || 'Unbekannt'}</td><td><strong>${item.clicks}</strong></td></tr>`).join('');
    } catch (err) { console.error('Error:', err); }
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
