'use client';

import { FormEvent, useState } from 'react';
import { api, ArticleRow } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Modal } from '@/components/Modal';

const STATUS = ['draft', 'published', 'archived'];

export default function ArticlesPage() {
  const { data, error, loading, reload } = useAsync(() => api.articles());
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(id: string) {
    if (!confirm('Inhalt wirklich löschen?')) return;
    await api.deleteArticle(id);
    reload();
  }

  return (
    <div>
      <div className="row-between">
        <h1 className="h1" style={{ margin: 0 }}>
          Inhalte (CMS)
        </h1>
        <button className="btn" onClick={() => setCreating(true)}>
          + Neuer Inhalt
        </button>
      </div>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Titel</th>
              <th>Kategorie</th>
              <th>Status</th>
              <th>Sprache</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.category}</td>
                <td>
                  <span className="badge">{a.status}</span>
                </td>
                <td>{a.locale}</td>
                <td>
                  <div className="actions">
                    <button
                      className="btn secondary"
                      onClick={() => setEditing(a)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => remove(a.id)}
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
                  Noch keine Inhalte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {creating && (
        <ArticleForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <ArticleForm
          article={editing}
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

function ArticleForm({
  article,
  onClose,
  onSaved,
}: {
  article?: ArticleRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!article;
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [title, setTitle] = useState(article?.title ?? '');
  const [category, setCategory] = useState(article?.category ?? '');
  const [status, setStatus] = useState(article?.status ?? 'draft');
  const [locale, setLocale] = useState(article?.locale ?? 'de-DE');
  const [tags, setTags] = useState((article?.tags ?? []).join(', '));
  const [body, setBody] = useState(article?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        category,
        status,
        locale,
        tags: tags
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        body,
      };
      if (isEdit) {
        await api.updateArticle(article!.id, payload);
      } else {
        await api.createArticle({ ...payload, slug });
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Inhalt bearbeiten' : 'Neuer Inhalt'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {!isEdit && (
          <div className="field">
            <label>Slug * (eindeutig)</label>
            <input
              className="input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="besser-schlafen"
              required
            />
          </div>
        )}
        <div className="field">
          <label>Titel *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Kategorie *</label>
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Schlaf"
            required
          />
        </div>
        <div className="field">
          <label>Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Sprache</label>
          <input
            className="input"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Tags (kommagetrennt)</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Inhalt</label>
          <textarea
            className="input"
            style={{ minHeight: 140 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Speichern…' : 'Speichern'}
        </button>
      </form>
    </Modal>
  );
}
