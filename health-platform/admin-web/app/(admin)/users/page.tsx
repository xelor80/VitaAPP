'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useAsync(
    () => api.users(query || undefined),
    [query],
  );

  async function toggle(id: string, status: string) {
    const next = status === 'suspended' ? 'active' : 'suspended';
    await api.setUserStatus(id, next);
    reload();
  }

  return (
    <div>
      <h1 className="h1">Benutzer</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="input"
          placeholder="E-Mail suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <button className="btn" onClick={() => setQuery(q)}>
          Suchen
        </button>
      </div>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>E-Mail</th>
              <th>Status</th>
              <th>Tarif</th>
              <th>Land</th>
              <th>Letzter Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <span className="badge">{u.status}</span>
                </td>
                <td>{u.entitlement}</td>
                <td>{u.country ?? '–'}</td>
                <td>
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString('de-DE')
                    : '–'}
                </td>
                <td>
                  <button
                    className="btn secondary"
                    onClick={() => toggle(u.id, u.status)}
                  >
                    {u.status === 'suspended' ? 'Entsperren' : 'Sperren'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
