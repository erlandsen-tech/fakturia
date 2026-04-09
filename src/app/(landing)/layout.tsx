import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fakturia — Enkel fakturering for småbedrifter | Lag faktura på minutter',
  description: 'Lag og send profesjonelle fakturaer på minutter. Betal kun per faktura — ingen abonnement nødvendig. Perfekt for enkeltpersonforetak og småbedrifter i Norge.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Fakturia — Enkel fakturering for småbedrifter',
    description: 'Lag faktura på minutter. Betal per faktura eller abonner. Prøv gratis i 30 dager.',
    url: '/',
    siteName: 'Fakturia',
    locale: 'nb_NO',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Fakturia — Enkel fakturering' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fakturia — Enkel fakturering for småbedrifter',
    description: 'Lag faktura på minutter. Betal per faktura eller abonner.',
    images: ['/og-image.png'],
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {children}
    </div>
  );
}