'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { Wordmark } from '@/components/brand/Wordmark';
import { Mark } from '@/components/brand/Mark';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Hide chrome on the marketing landing page and on public invoice pages.
  if (pathname === '/' || pathname?.startsWith('/i/')) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navLinkClass = (active: boolean) =>
    cn(
      'font-medium text-sm transition-colors pb-0.5',
      active
        ? 'text-ink border-b-2 border-clay'
        : 'text-ink-3 hover:text-ink',
    );

  return (
    <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto py-4 px-6 flex justify-between items-center">
        <Link
          href={user ? '/dashboard' : '/'}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Mark size={28} />
          <Wordmark size={0.7} />
        </Link>
        {user && (
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className={navLinkClass(pathname === '/dashboard')}>
              {t('Dashboard')}
            </Link>
            <Link href="/invoices" className={navLinkClass(pathname === '/invoices')}>
              {t('Invoices')}
            </Link>
            <Link href="/clients" className={navLinkClass(pathname === '/clients')}>
              {t('Clients')}
            </Link>
            <Link href="/settings" className={navLinkClass(pathname === '/settings')}>
              {t('Settings')}
            </Link>
          </nav>
        )}
        <div className="flex items-center space-x-4">
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              {t('Sign Out')}
            </Button>
          ) : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">{t('Sign In')}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
