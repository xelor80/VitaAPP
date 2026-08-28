'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function RulesPage() {
  const { data, error, loading } = useAsync(() => api.rules());
  return (
    <div>
      <h1 className="h1">Regeln (Rule-Engine)</h1>
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
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Noch keine Regeln angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: 16 }}>
        Anlegen/Bearbeiten folgt (POST/PATCH /admin/rules bestehen bereits im Backend).
      </p>
    </div>
  );
}
