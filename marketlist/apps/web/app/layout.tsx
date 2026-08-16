import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { SentryInit } from '../components/SentryInit';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Marketlist — Household food system',
  description:
    'Acquire, inventory, consume, and effect: shared aisle lists, pantry, recipes and meal logs, lifestyle macros, price memory, and quiet healthy suggestions — not medical advice.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Marketlist',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#E8A317',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <SentryInit />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
