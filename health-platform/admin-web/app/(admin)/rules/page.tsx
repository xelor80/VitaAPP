'use client';

import { FormEvent, useState } from 'react';
import { api, RuleRow } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { Modal } from '@/components/Modal';

const METRICS = [
  'heart_rate',
  'hrv',
  'spo2',
  'temperature',
  'stress',
  'steps',
];
const SEVERITIES = ['info', 'hint', 'notable', 'important'];

const DEFAULT_DEFINITION = JSON.stringify(
  {
    condition: { type: 'threshold', operator: 'lt', value: 90 },
    occurrences: { count: 3, within: '1d' },
    cooldown: { hours: 12 },
  },
  null,
  2,
);
const DEFAULT_CONTENT = JSON.stringify(
  { title_key: 'alert.example.title', body_key: 'alert.example.body' },
  null,
  2,
);

export default function RulesPage() {
  const { data, error, loading, reload } = useAsync(() => api.rules());
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(id: string) {
    if (!confirm('Regel wirklich löschen?')) return;
    await api.deleteRule(id);
    reload();
  }

  return (
    <div>
      <div className="row-between">
        <h1 className="h1" style={{ margin: 0 }}>
          Regeln (Rule-Engine)
        </h1>
        <button className="btn" onClick={() => setCreating(true)}>
          + Neue Regel
        </button>
      </div>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Schweregrad</th>
              <th>Push</th>
              <th>Aktiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.metric}</td>
                <td>
                  <span className="badge">{r.severity}</span>
                </td>
                <td>{r.notify ? 'ja' : 'nein'}</td>
                <td>{r.active ? 'ja' : 'nein'}</td>
                <td>
                  <div className="actions">
                    <button
                      className="btn secondary"
                      onClick={() => setEditing(r)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => remove(r.id)}
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
                  Noch keine Regeln angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {creating && (
        <RuleForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <RuleForm
          rule={editing}
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

function RuleForm({
  rule,
  onClose,
  onSaved,
}: {
  rule?: RuleRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!rule;
  const [metric, setMetric] = useState(rule?.metric ?? 'spo2');
  const [severity, setSeverity] = useState(rule?.severity ?? 'notable');
  const [notify, setNotify] = useState(rule?.notify ?? true);
  const [active, setActive] = useState(rule?.active ?? true);
  const [definition, setDefinition] = useState(
    rule?.definition
      ? JSON.stringify(rule.definition, null, 2)
      : DEFAULT_DEFINITION,
  );
  const [contentKey, setContentKey] = useState(
    rule?.contentKey
      ? JSON.stringify(rule.contentKey, null, 2)
      : DEFAULT_CONTENT,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let parsedDef: unknown;
    let parsedContent: unknown;
    try {
      parsedDef = JSON.parse(definition);
      parsedContent = JSON.parse(contentKey);
    } catch {
      setError('Definition/Text-Keys müssen gültiges JSON sein.');
      return;
    }
    setBusy(true);
    try {
      const body = {
        metric,
        severity,
        notify,
        active,
        definition: parsedDef,
        contentKey: parsedContent,
      };
      if (isEdit) {
        await api.updateRule(rule!.id, body);
      } else {
        await api.createRule(body);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Regel bearbeiten' : 'Neue Regel'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Metrik</label>
          <select
            className="input"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            disabled={isEdit}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Schweregrad</label>
          <select
            className="input"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field checkbox">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          <span>Push-Benachrichtigung senden</span>
        </div>
        <div className="field checkbox">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Aktiv</span>
        </div>
        <div className="field">
          <label>Definition (JSON)</label>
          <textarea
            className="input"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Text-Keys (JSON)</label>
          <textarea
            className="input"
            value={contentKey}
            onChange={(e) => setContentKey(e.target.value)}
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
