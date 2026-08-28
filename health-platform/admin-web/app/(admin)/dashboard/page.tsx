'use client';

import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const LABELS: Record<string, string> = {
  users: 'Registrierte Nutzer',
  activeUsers: 'Aktive Nutzer',
  dau: 'DAU (heute)',
  devices: 'Verbundene Geräte',
  measurementsToday: 'Messungen heute',
  openAlerts: 'Offene Warnungen',
  pushToday: 'Push heute',
  affiliateClicksMonth: 'Affiliate-Klicks (30 T)',
};

export default function DashboardPage() {
  const { data, error, loading } = useAsync(() => api.stats());

  return (
    <div>
      <h1 className="h1">Dashboard</h1>
      {loading && <p className="muted">Lädt…</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <div className="grid">
          {Object.entries(LABELS).map(([key, label]) => (
            <div key={key} className="card stat">
              <div className="label">{label}</div>
              <div className="value">{data[key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ marginTop: 16 }}>
        Keine individuellen Gesundheitsdaten – nur aggregierte Kennzahlen.
      </p>
    </div>
  );
}
