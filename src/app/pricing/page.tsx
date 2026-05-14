'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

type Pack = { id: 'pack_5' | 'pack_10' | 'pack_25'; name: string; price: string; per: string; highlight: boolean };

const PACKS: Pack[] = [
  { id: 'pack_5', name: '5-pakke', price: '49', per: '9.80/faktura', highlight: false },
  { id: 'pack_10', name: '10-pakke', price: '89', per: '8.90/faktura', highlight: false },
  { id: 'pack_25', name: '25-pakke', price: '199', per: '7.96/faktura', highlight: true },
];

export default function PricingPage() {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function startCheckout(payload: { type: 'pack'; pack: string }) {
    const id = payload.pack;
    setPendingId(id);

    // Require auth before creating a session
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent('/pricing')}`);
      return;
    }

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Kunne ikke starte betaling');
        setPendingId(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Nettverksfeil. Prøv igjen.');
      setPendingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Tilbake</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-4">
            Enkel pris, ingen binding
          </h1>
          <p className="text-lg text-slate-600">
            Kjøp fakturaer når du trenger dem, eller abonner for ubegrenset.
          </p>
        </div>

        <section>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKS.map((pack) => (
              <Card key={pack.id} className={`border-2 ${pack.highlight ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                <CardContent className="pt-6 text-center">
                  {pack.highlight && <Badge className="mb-2 bg-emerald-500">Mest populær</Badge>}
                  <h3 className="font-semibold text-slate-900 mb-2">{pack.name}</h3>
                  <div className="text-4xl font-bold text-slate-900 mb-1">{pack.price} kr</div>
                  <p className="text-sm text-slate-500 mb-4">{pack.per}</p>
                  <Button
                    onClick={() => startCheckout({ type: 'pack', pack: pack.id })}
                    disabled={pendingId !== null}
                    variant={pack.highlight ? 'default' : 'outline'}
                    className={`w-full ${pack.highlight ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                  >
                    {pendingId === pack.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `Kjøp ${pack.name.toLowerCase()}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <p className="text-center text-sm text-slate-500 mt-12">
          Betal per faktura. Ingen abonnement, ingen binding. Alle priser er eks. mva.
          <br />
          Kvittering sendes automatisk til e-posten din etter betaling.
        </p>
      </div>
    </main>
  );
}
