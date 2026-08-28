import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VitaGuide Admin',
  description: 'Verwaltung der VitaGuide Health-Plattform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
