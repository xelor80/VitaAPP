'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function ArticlesPage() {
  const { data, error, loading } = useAsync(() => api.articles());
  return (
    <div>
      <h1 className="h1">Inhalte (CMS)</h1>
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
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Noch keine Inhalte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
