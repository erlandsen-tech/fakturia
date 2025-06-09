import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { t } from '@/lib/i18n';

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto py-20 flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">{t('Invoice Generation for Micro-Businesses')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-10">
            {t('Generate professional invoices on demand, track payments, and manage your clients - all in one place.')}
          </p>
          <div className="flex gap-4">
            <Link href="/sign-up">
              <Button size="lg">{t('Start for Free')}</Button>
            </Link>
            <Button variant="outline" size="lg">{t('Learn More')}</Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted py-20">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{t('Everything You Need')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">{t('Create Invoices')}</h3>
                <p className="text-muted-foreground">
                  {t('Generate professional invoices in seconds with customizable templates.')}
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">{t('Manage Clients')}</h3>
                <p className="text-muted-foreground">
                  {t('Keep track of your clients and their billing information in one place.')}
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold mb-3">{t('Get Paid Faster')}</h3>
                <p className="text-muted-foreground">
                  {t('Integrated with Stripe for seamless payment processing.')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 Fakturia. {t('All rights reserved.')}</p>
        </div>
      </footer>
    </div>
  );
}
