'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ProductsPage() {
  const { data, error, loading } = useAsync(() => api.products());
  return (
    <div>
      <h1 className="h1">Produkte</h1>
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
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category ?? '–'}</td>
                <td>{p.priority}</td>
                <td>{p.active ? 'ja' : 'nein'}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Noch keine Produkte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
