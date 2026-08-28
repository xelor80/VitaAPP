'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ConfigPage() {
  const { data, error, loading } = useAsync(() => api.config());
  return (
    <div>
      <h1 className="h1">App-Konfiguration</h1>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Schlüssel</th>
              <th>Wert</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.key}>
                <td>{c.key}</td>
                <td>
                  <code style={{ fontSize: 12 }}>
                    {JSON.stringify(c.value)}
                  </code>
                </td>
                <td>{c.version}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Keine Konfiguration (Seed ausführen).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ marginTop: 16 }}>
        Score-Gewichte &amp; Tagesziele werden hier gepflegt (PUT /admin/config/:key).
      </p>
    </div>
  );
}
