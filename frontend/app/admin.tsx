import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { adminStyles as styles } from '../components/admin/adminStyles';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Tab = 'stats' | 'products' | 'recipes' | 'clicks';

interface Stats {
  products_de: number;
  products_it: number;
  recipes: number;
  analyses: number;
  affiliate_clicks: number;
  diary_entries: number;
}

interface Product {
  product_id: string;
  name: string;
  description?: string;
  tags?: string[];
  affiliate_url?: string;
  image_url?: string;
  price?: string;
  rating?: string;
  application_instructions?: string;
  video_url?: string;
}

interface Recipe {
  id: string;
  de: { title: string; ingredients: string[]; steps: string[]; tags: string[] };
  it: { title: string; ingredients: string[]; steps: string[]; tags: string[] };
  time_min: number;
  symptom_tags: string[];
  image_url: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('stats');
  const [lang, setLang] = useState<'de' | 'it'>('de');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [clicks, setClicks] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editType, setEditType] = useState<'product' | 'recipe'>('product');

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/products?lang=${lang}&search=${search}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  }, [lang, search]);

  // Fetch recipes
  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/recipes?search=${search}`);
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (e) {
      console.error('Error fetching recipes:', e);
    }
  }, [search]);

  // Fetch clicks
  const fetchClicks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/clicks?days=30`);
      const data = await res.json();
      setClicks(data);
    } catch (e) {
      console.error('Error fetching clicks:', e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'products') fetchProducts();
    if (tab === 'recipes') fetchRecipes();
    if (tab === 'clicks') fetchClicks();
  }, [tab, lang, search]);

  // Delete product
  const deleteProduct = async (productId: string) => {
    Alert.alert('Löschen', `Produkt "${productId}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/admin/products/${productId}?lang=${lang}`, { method: 'DELETE' });
            fetchProducts();
          } catch (e) {
            Alert.alert('Fehler', 'Löschen fehlgeschlagen');
          }
        }
      }
    ]);
  };

  // Delete recipe
  const deleteRecipe = async (recipeId: string) => {
    Alert.alert('Löschen', `Rezept "${recipeId}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/admin/recipes/${recipeId}`, { method: 'DELETE' });
            fetchRecipes();
          } catch (e) {
            Alert.alert('Fehler', 'Löschen fehlgeschlagen');
          }
        }
      }
    ]);
  };

  // Open edit modal
  const openEdit = (type: 'product' | 'recipe', item?: any) => {
    setEditType(type);
    setEditItem(item || null);
    setModalVisible(true);
  };

  // Save item
  const saveItem = async (formData: any) => {
    try {
      const isNew = !editItem;
      if (editType === 'product') {
        const url = isNew
          ? `${API_URL}/api/admin/products?lang=${lang}`
          : `${API_URL}/api/admin/products/${editItem.product_id}?lang=${lang}`;
        await fetch(url, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        fetchProducts();
      } else {
        const url = isNew
          ? `${API_URL}/api/admin/recipes`
          : `${API_URL}/api/admin/recipes/${editItem.id}`;
        await fetch(url, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        fetchRecipes();
      }
      setModalVisible(false);
      fetchStats();
    } catch (e) {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Lade Admin-Panel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#94A3B8" />
          <Text style={styles.backBtnText}>Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Stats Cards */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 100 }}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.products_de}</Text>
              <Text style={styles.statLabel}>Produkte DE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.products_it}</Text>
              <Text style={styles.statLabel}>Produkte IT</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.recipes}</Text>
              <Text style={styles.statLabel}>Rezepte</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.analyses}</Text>
              <Text style={styles.statLabel}>Analysen</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.affiliate_clicks}</Text>
              <Text style={styles.statLabel}>Affiliate Klicks</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['stats', 'products', 'recipes', 'clicks'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'stats' ? 'Übersicht' : t === 'products' ? 'Produkte' : t === 'recipes' ? 'Rezepte' : 'Klicks'}
            </Text>
          </TouchableOpacity>
        ))}
        
        {tab === 'products' && (
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'de' && styles.langBtnActive]}
              onPress={() => setLang('de')}
            >
              <Text style={[styles.langBtnText, lang === 'de' && styles.langBtnTextActive]}>DE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'it' && styles.langBtnActive]}
              onPress={() => setLang('it')}
            >
              <Text style={[styles.langBtnText, lang === 'it' && styles.langBtnTextActive]}>IT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Products Tab */}
        {tab === 'products' && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Produkt suchen..."
                placeholderTextColor="#64748B"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => openEdit('product')}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Neues Produkt</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Name</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Preis</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Aktionen</Text>
            </View>
            {products.map(p => (
              <View key={p.product_id} style={styles.tableRow}>
                <Text style={[styles.tableCellSmall, { flex: 2 }]} numberOfLines={1}>{p.product_id}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{p.price || '-'}</Text>
                <View style={{ flex: 1.5, flexDirection: 'row' }}>
                  <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit('product', p)}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteProduct(p.product_id)}>
                    <Text style={styles.actionBtnText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recipes Tab */}
        {tab === 'recipes' && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Rezept suchen..."
                placeholderTextColor="#64748B"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity style={styles.addBtn} onPress={() => openEdit('recipe')}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Neues Rezept</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel (DE)</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Titel (IT)</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Aktionen</Text>
            </View>
            {recipes.map(r => (
              <View key={r.id} style={styles.tableRow}>
                <Text style={[styles.tableCellSmall, { flex: 2 }]} numberOfLines={1}>{r.id}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>{r.de?.title || '-'}</Text>
                <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>{r.it?.title || '-'}</Text>
                <View style={{ flex: 1.5, flexDirection: 'row' }}>
                  <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => openEdit('recipe', r)}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteRecipe(r.id)}>
                    <Text style={styles.actionBtnText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Clicks Tab */}
        {tab === 'clicks' && clicks && (
          <>
            <View style={[styles.statCard, { marginBottom: 16 }]}>
              <Text style={styles.statValue}>{clicks.total_clicks}</Text>
              <Text style={styles.statLabel}>Klicks (letzte {clicks.period_days} Tage)</Text>
            </View>

            <Text style={[styles.tableHeaderCell, { marginBottom: 12 }]}>TOP PRODUKTE</Text>
            {clicks.by_product?.map((item: any) => (
              <View key={item._id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{item._id || 'Unknown'}</Text>
                <Text style={[styles.statValue, { flex: 1 }]}>{item.clicks}</Text>
              </View>
            ))}
          </>
        )}

        {/* Stats Tab */}
        {tab === 'stats' && stats && (
          <View style={{ padding: 20 }}>
            <Text style={[styles.headerTitle, { marginBottom: 20 }]}>Systemübersicht</Text>
            <Text style={styles.tableCell}>
              Das VitaGuide Admin Panel ermöglicht die Verwaltung von Produkten und Rezepten direkt in der MongoDB-Datenbank.
            </Text>
            <Text style={[styles.tableCell, { marginTop: 16 }]}>
              • {stats.products_de} deutsche Produkte{'\n'}
              • {stats.products_it} italienische Produkte{'\n'}
              • {stats.recipes} zweisprachige Rezepte{'\n'}
              • {stats.analyses} durchgeführte Analysen{'\n'}
              • {stats.affiliate_clicks} Affiliate-Klicks
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editItem ? `${editType === 'product' ? 'Produkt' : 'Rezept'} bearbeiten` : `Neues ${editType === 'product' ? 'Produkt' : 'Rezept'}`}
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {editType === 'product' ? (
                <ProductForm
                  initial={editItem}
                  onSave={saveItem}
                  onCancel={() => setModalVisible(false)}
                  lang={lang}
                />
              ) : (
                <RecipeForm
                  initial={editItem}
                  onSave={saveItem}
                  onCancel={() => setModalVisible(false)}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Product Form Component
function ProductForm({ initial, onSave, onCancel, lang }: any) {
  const [form, setForm] = useState({
    product_id: initial?.product_id || '',
    name: initial?.name || '',
    description: initial?.description || '',
    tags: initial?.tags?.join(', ') || '',
    affiliate_url: initial?.affiliate_url || '',
    image_url: initial?.image_url || '',
    price: initial?.price || '',
    rating: initial?.rating || '',
    application_instructions: initial?.application_instructions || '',
    video_url: initial?.video_url || '',
  });

  const handleSave = () => {
    if (!form.product_id || !form.name) {
      Alert.alert('Fehler', 'ID und Name sind erforderlich');
      return;
    }
    onSave({
      ...form,
      tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    });
  };

  return (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Produkt-ID *</Text>
        <TextInput
          style={styles.formInput}
          value={form.product_id}
          onChangeText={v => setForm({ ...form, product_id: v })}
          editable={!initial}
          placeholder="z.B. vitamin-d3-tropfen"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name *</Text>
        <TextInput
          style={styles.formInput}
          value={form.name}
          onChangeText={v => setForm({ ...form, name: v })}
          placeholder="Produktname"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Beschreibung</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.description}
          onChangeText={v => setForm({ ...form, description: v })}
          multiline
          placeholder="Produktbeschreibung"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Tags (kommagetrennt)</Text>
        <TextInput
          style={styles.formInput}
          value={form.tags}
          onChangeText={v => setForm({ ...form, tags: v })}
          placeholder="energie, vitamine, immunsystem"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Affiliate-URL</Text>
        <TextInput
          style={styles.formInput}
          value={form.affiliate_url}
          onChangeText={v => setForm({ ...form, affiliate_url: v })}
          placeholder="https://shop.example.com/product?aff=emergent"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Bild-URL</Text>
        <TextInput
          style={styles.formInput}
          value={form.image_url}
          onChangeText={v => setForm({ ...form, image_url: v })}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Preis</Text>
        <TextInput
          style={styles.formInput}
          value={form.price}
          onChangeText={v => setForm({ ...form, price: v })}
          placeholder="CHF 29.90"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Anwendungshinweise</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.application_instructions}
          onChangeText={v => setForm({ ...form, application_instructions: v })}
          multiline
          placeholder="1 Kapsel täglich..."
          placeholderTextColor="#64748B"
        />
      </View>
      {lang === 'it' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Video-URL (nur IT)</Text>
          <TextInput
            style={styles.formInput}
            value={form.video_url}
            onChangeText={v => setForm({ ...form, video_url: v })}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor="#64748B"
          />
        </View>
      )}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.btnText}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.btnText}>Speichern</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// Recipe Form Component
function RecipeForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    id: initial?.id || '',
    de_title: initial?.de?.title || '',
    de_ingredients: initial?.de?.ingredients?.join('\n') || '',
    de_steps: initial?.de?.steps?.join('\n') || '',
    it_title: initial?.it?.title || '',
    it_ingredients: initial?.it?.ingredients?.join('\n') || '',
    it_steps: initial?.it?.steps?.join('\n') || '',
    time_min: String(initial?.time_min || 20),
    symptom_tags: initial?.symptom_tags?.join(', ') || '',
    image_url: initial?.image_url || '',
  });

  const handleSave = () => {
    if (!form.id || !form.de_title) {
      Alert.alert('Fehler', 'ID und deutscher Titel sind erforderlich');
      return;
    }
    onSave({
      id: form.id,
      de: {
        title: form.de_title,
        ingredients: form.de_ingredients.split('\n').filter(Boolean),
        steps: form.de_steps.split('\n').filter(Boolean),
        tags: []
      },
      it: {
        title: form.it_title,
        ingredients: form.it_ingredients.split('\n').filter(Boolean),
        steps: form.it_steps.split('\n').filter(Boolean),
        tags: []
      },
      time_min: parseInt(form.time_min) || 20,
      symptom_tags: form.symptom_tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      image_url: form.image_url
    });
  };

  return (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Rezept-ID *</Text>
        <TextInput
          style={styles.formInput}
          value={form.id}
          onChangeText={v => setForm({ ...form, id: v })}
          editable={!initial}
          placeholder="z.B. gruener-smoothie"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Titel (DE) *</Text>
        <TextInput
          style={styles.formInput}
          value={form.de_title}
          onChangeText={v => setForm({ ...form, de_title: v })}
          placeholder="Grüner Energie-Smoothie"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Zutaten (DE) - eine pro Zeile</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.de_ingredients}
          onChangeText={v => setForm({ ...form, de_ingredients: v })}
          multiline
          placeholder="1 Banane&#10;100g Spinat&#10;200ml Mandelmilch"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Schritte (DE) - einer pro Zeile</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.de_steps}
          onChangeText={v => setForm({ ...form, de_steps: v })}
          multiline
          placeholder="Alle Zutaten in den Mixer geben&#10;2 Minuten mixen&#10;Sofort servieren"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Titel (IT)</Text>
        <TextInput
          style={styles.formInput}
          value={form.it_title}
          onChangeText={v => setForm({ ...form, it_title: v })}
          placeholder="Smoothie Verde Energizzante"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Zutaten (IT) - eine pro Zeile</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.it_ingredients}
          onChangeText={v => setForm({ ...form, it_ingredients: v })}
          multiline
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Schritte (IT) - einer pro Zeile</Text>
        <TextInput
          style={[styles.formInput, styles.formTextarea]}
          value={form.it_steps}
          onChangeText={v => setForm({ ...form, it_steps: v })}
          multiline
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Zubereitungszeit (Minuten)</Text>
        <TextInput
          style={styles.formInput}
          value={form.time_min}
          onChangeText={v => setForm({ ...form, time_min: v })}
          keyboardType="numeric"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Symptom-Tags (kommagetrennt)</Text>
        <TextInput
          style={styles.formInput}
          value={form.symptom_tags}
          onChangeText={v => setForm({ ...form, symptom_tags: v })}
          placeholder="Müdigkeit, Energie, Immunsystem"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Bild-URL</Text>
        <TextInput
          style={styles.formInput}
          value={form.image_url}
          onChangeText={v => setForm({ ...form, image_url: v })}
          placeholder="https://example.com/recipe.jpg"
          placeholderTextColor="#64748B"
        />
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.btnText}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.btnText}>Speichern</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
