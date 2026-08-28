'use client';

import { FormEvent, useState } from 'react';
import { api, ProductRow } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Modal } from '@/components/Modal';

export default function ProductsPage() {
  const { data, error, loading, reload } = useAsync(() => api.products());
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(id: string) {
    if (!confirm('Produkt wirklich löschen?')) return;
    await api.deleteProduct(id);
    reload();
  }

  return (
    <div>
      <div className="row-between">
        <h1 className="h1" style={{ margin: 0 }}>
          Produkte
        </h1>
        <button className="btn" onClick={() => setCreating(true)}>
          + Neues Produkt
        </button>
      </div>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Kategorie</th>
              <th>Priorität</th>
              <th>Aktiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category ?? '–'}</td>
                <td>{p.priority}</td>
                <td>{p.active ? 'ja' : 'nein'}</td>
                <td>
                  <div className="actions">
                    <button
                      className="btn secondary"
                      onClick={() => setEditing(p)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => remove(p.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Noch keine Produkte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {creating && (
        <ProductForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product?: ProductRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? '');
  const [manufacturer, setManufacturer] = useState(product?.manufacturer ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [price, setPrice] = useState(
    product?.price != null ? String(product.price) : '',
  );
  const [priority, setPriority] = useState(String(product?.priority ?? 0));
  const [weight, setWeight] = useState(
    String(product?.recommendationWeight ?? 0),
  );
  const [tags, setTags] = useState((product?.tags ?? []).join(', '));
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name,
        manufacturer: manufacturer || undefined,
        category: category || undefined,
        price: price ? Number(price) : undefined,
        priority: Number(priority),
        recommendationWeight: Number(weight),
        tags: tags
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        active,
      };
      if (isEdit) await api.updateProduct(product!.id, body);
      else await api.createProduct(body);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Produkt bearbeiten' : 'Neues Produkt'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Hersteller</label>
          <input
            className="input"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Kategorie</label>
          <input
            className="input"
            value={category ?? ''}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Preis (EUR)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Priorität / Empfehlungsgewicht</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
            <input
              className="input"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Tags (kommagetrennt)</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Magnesium, Schlaf, Recovery"
          />
        </div>
        <div className="field checkbox">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Aktive Empfehlung</span>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Speichern…' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}
