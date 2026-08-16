'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../components/AppShell';
import { readSession } from '../../lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!readSession()) router.replace('/login');
  }, [router]);

  return <AppShell>{children}</AppShell>;
}
