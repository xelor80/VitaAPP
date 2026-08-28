'use client';

import { FormEvent, useState } from 'react';
import { api, ConfigRow } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Modal } from '@/components/Modal';

export default function ConfigPage() {
  const { data, error, loading, reload } = useAsync(() => api.config());
  const [editing, setEditing] = useState<ConfigRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="row-between">
        <h1 className="h1" style={{ margin: 0 }}>
          App-Konfiguration
        </h1>
        <button className="btn" onClick={() => setCreating(true)}>
          + Neuer Schlüssel
        </button>
      </div>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Schlüssel</th>
              <th>Wert</th>
              <th>Version</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.key}>
                <td>{c.key}</td>
                <td>
                  <code style={{ fontSize: 12 }}>{JSON.stringify(c.value)}</code>
                </td>
                <td>{c.version}</td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={() => setEditing(c)}
                  >
                    Bearbeiten
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Keine Konfiguration (Seed ausführen).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: 16 }}>
        z. B. <code>score_weights</code> und <code>daily_goals</code> (Score-Gewichte &amp;
        Tagesziele) live anpassen.
      </p>

      {creating && (
        <ConfigForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <ConfigForm
          entry={editing}
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

function ConfigForm({
  entry,
  onClose,
  onSaved,
}: {
  entry?: ConfigRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!entry;
  const [key, setKey] = useState(entry?.key ?? '');
  const [value, setValue] = useState(
    JSON.stringify(entry?.value ?? {}, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      setError('Wert muss gültiges JSON sein.');
      return;
    }
    setBusy(true);
    try {
      await api.putConfig(key, parsed);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Konfiguration: ${entry!.key}` : 'Neuer Schlüssel'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Schlüssel</label>
          <input
            className="input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={isEdit}
            required
          />
        </div>
        <div className="field">
          <label>Wert (JSON)</label>
          <textarea
            className="input"
            style={{ minHeight: 160 }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
