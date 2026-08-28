'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function AuditPage() {
  const { data, error, loading } = useAsync(() => api.auditLogs());
  return (
    <div>
      <h1 className="h1">Audit-Log</h1>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Akteur</th>
              <th>Aktion</th>
              <th>Ziel</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.at).toLocaleString('de-DE')}</td>
                <td>{l.actor}</td>
                <td>{l.action}</td>
                <td>
                  {l.targetType ? `${l.targetType}:${l.targetId ?? ''}` : '–'}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Noch keine Einträge.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
