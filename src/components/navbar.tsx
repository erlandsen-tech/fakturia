'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { Wordmark } from '@/components/brand/Wordmark';
import { Mark } from '@/components/brand/Mark';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const mobileLinkClass = (active: boolean) =>
    cn(
      'block px-6 py-3 text-base font-medium transition-colors border-l-2',
      active
        ? 'text-ink border-clay bg-paper-2'
        : 'text-ink-3 border-transparent hover:text-ink hover:bg-paper-2',
    );

  const navItems: Array<[string, string]> = [
    ['/dashboard', t('Dashboard')],
    ['/invoices', t('Invoices')],
    ['/clients', t('Clients')],
    ['/products', t('Products')],
    ['/settings', t('Settings')],
  ];

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
            {navItems.map(([href, label]) => (
              <Link key={href} href={href} className={navLinkClass(pathname === href)}>
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="hidden md:inline-flex"
              >
                {t('Sign Out')}
              </Button>
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-sm text-ink hover:bg-ink/[.04]"
                aria-label={mobileOpen ? t('Close menu') : t('Open menu')}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <Link href="/sign-in">
              <Button variant="outline" size="sm">{t('Sign In')}</Button>
            </Link>
          )}
        </div>
      </div>

      {user && mobileOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-ink/10 bg-paper"
        >
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={mobileLinkClass(pathname === href)}
            >
              {label}
            </Link>
          ))}
          <div className="px-6 py-3 border-t border-ink/10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full"
            >
              {t('Sign Out')}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
