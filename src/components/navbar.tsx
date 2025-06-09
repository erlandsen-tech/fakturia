'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

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

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="border-b border-border">
      <div className="container mx-auto py-4 flex justify-between items-center">
        <Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold">
          Fakturia
        </Link>
        {user && (
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/dashboard" 
              className={cn(
                "font-medium transition-colors",
                pathname === "/dashboard" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('Dashboard')}
            </Link>
            <Link 
              href="/invoices" 
              className={cn(
                "font-medium transition-colors",
                pathname === "/invoices" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('Invoices')}
            </Link>
            <Link 
              href="/clients" 
              className={cn(
                "font-medium transition-colors",
                pathname === "/clients" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('Clients')}
            </Link>
            <Link 
              href="/settings" 
              className={cn(
                "font-medium transition-colors",
                pathname === "/settings" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('Settings')}
            </Link>
          </nav>
        )}
        <div className="flex items-center space-x-4">
          {user ? (
            <Button variant="outline" onClick={handleSignOut}>
              {t('Sign Out')}
            </Button>
          ) : (
            <Link href="/sign-in">
              <Button variant="outline">{t('Sign In')}</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 