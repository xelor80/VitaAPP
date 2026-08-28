'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearToken, getToken } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Benutzer' },
  { href: '/rules', label: 'Regeln' },
  { href: '/products', label: 'Produkte' },
  { href: '/articles', label: 'Inhalte' },
  { href: '/config', label: 'App-Konfiguration' },
  { href: '/audit', label: 'Audit-Log' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">VitaGuide</div>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
          <a
            style={{ marginTop: 12, cursor: 'pointer' }}
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
          >
            Abmelden
          </a>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
