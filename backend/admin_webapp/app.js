// VitaGuide Admin Webapp
const API_BASE = '/api';
let currentLang = 'de';
let editingProduct = null;
let editingRecipe = null;

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

// Check if already logged in
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
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
    
    // Load data
    switch(tab) {
        case 'products': loadProducts(); break;
        case 'recipes': loadRecipes(); break;
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
    document.querySelectorAll('.lang-btn').forEach(btn => {
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

function searchProducts() {
    loadProducts();
}

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
    } catch (err) {
        alert('Fehler beim Laden des Produkts');
    }
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
        const url = editingProduct 
            ? `/admin/products/${editingProduct.product_id}?lang=${currentLang}`
            : `/admin/products?lang=${currentLang}`;
        
        const res = await apiCall(url, {
            method,
            body: JSON.stringify(productData)
        });
        
        if (res.ok) {
            closeProductModal();
            loadProducts();
            loadStats();
        } else {
            const err = await res.json();
            alert(err.detail || 'Fehler beim Speichern');
        }
    } catch (err) {
        alert('Fehler beim Speichern');
    }
}

async function deleteProduct(productId) {
    if (!confirm(`Produkt "${productId}" wirklich löschen?`)) return;
    
    try {
        const res = await apiCall(`/admin/products/${productId}?lang=${currentLang}`, { method: 'DELETE' });
        if (res.ok) {
            loadProducts();
            loadStats();
        } else {
            alert('Fehler beim Löschen');
        }
    } catch (err) {
        alert('Fehler beim Löschen');
    }
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
    } catch (err) {
        console.error('Error loading recipes:', err);
    }
}

function searchRecipes() {
    loadRecipes();
}

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

function closeRecipeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
    editingRecipe = null;
}

async function editRecipe(recipeId) {
    try {
        const res = await apiCall(`/admin/recipes?search=${recipeId}`);
        const data = await res.json();
        const recipe = data.recipes.find(r => r.id === recipeId);
        if (recipe) openRecipeModal(recipe);
    } catch (err) {
        alert('Fehler beim Laden des Rezepts');
    }
}

async function saveRecipe(e) {
    e.preventDefault();
    
    const recipeData = {
        id: document.getElementById('rec-id').value,
        time_min: parseInt(document.getElementById('rec-time').value) || 20,
        de: {
            title: document.getElementById('rec-de-title').value,
            ingredients: document.getElementById('rec-de-ingredients').value.split('\n').filter(Boolean),
            steps: document.getElementById('rec-de-steps').value.split('\n').filter(Boolean),
            tags: []
        },
        it: {
            title: document.getElementById('rec-it-title').value,
            ingredients: document.getElementById('rec-it-ingredients').value.split('\n').filter(Boolean),
            steps: document.getElementById('rec-it-steps').value.split('\n').filter(Boolean),
            tags: []
        },
        symptom_tags: document.getElementById('rec-symptom-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        image_url: document.getElementById('rec-image-url').value
    };
    
    try {
        const method = editingRecipe ? 'PUT' : 'POST';
        const url = editingRecipe 
            ? `/admin/recipes/${editingRecipe.id}`
            : '/admin/recipes';
        
        const res = await apiCall(url, {
            method,
            body: JSON.stringify(recipeData)
        });
        
        if (res.ok) {
            closeRecipeModal();
            loadRecipes();
            loadStats();
        } else {
            const err = await res.json();
            alert(err.detail || 'Fehler beim Speichern');
        }
    } catch (err) {
        alert('Fehler beim Speichern');
    }
}

async function deleteRecipe(recipeId) {
    if (!confirm(`Rezept "${recipeId}" wirklich löschen?`)) return;
    
    try {
        const res = await apiCall(`/admin/recipes/${recipeId}`, { method: 'DELETE' });
        if (res.ok) {
            loadRecipes();
            loadStats();
        } else {
            alert('Fehler beim Löschen');
        }
    } catch (err) {
        alert('Fehler beim Löschen');
    }
}

// ============ CLICKS ============
async function loadClicks() {
    try {
        const res = await apiCall('/admin/clicks?days=30');
        const data = await res.json();
        
        document.getElementById('clicks-summary').innerHTML = `
            <h3>Affiliate-Klicks (letzte ${data.period_days} Tage)</h3>
            <p><strong>${data.total_clicks}</strong> Klicks insgesamt</p>
        `;
        
        const tbody = document.getElementById('clicks-table');
        tbody.innerHTML = (data.by_product || []).map(item => `
            <tr>
                <td>${item._id || 'Unbekannt'}</td>
                <td><strong>${item.clicks}</strong></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading clicks:', err);
    }
}

// ============ LOGS ============
async function loadLogs() {
    try {
        const res = await apiCall('/admin/llm-logs?limit=50');
        const data = await res.json();
        
        document.getElementById('logs-stats').innerHTML = `
            <h3>LLM Statistiken</h3>
            <p>Aufrufe: <strong>${data.stats?.total_calls || 0}</strong> | 
               Erfolgsrate: <strong>${data.stats?.success_rate || '0%'}</strong> | 
               Ø Latenz: <strong>${data.stats?.avg_latency_ms || 0}ms</strong></p>
        `;
        
        const tbody = document.getElementById('logs-table');
        tbody.innerHTML = (data.logs || []).map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString('de-DE')}</td>
                <td>${log.endpoint}</td>
                <td>${log.lang}</td>
                <td>${log.latency_ms}ms</td>
                <td style="color: ${log.success ? '#10B981' : '#EF4444'}">${log.success ? '✓' : '✗'}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading logs:', err);
    }
}
