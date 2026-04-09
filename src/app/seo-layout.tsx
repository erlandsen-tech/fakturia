import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Fakturia — Enkel fakturering for småbedrifter',
    template: '%s | Fakturia',
  },
  description: 'Lag og send profesjonelle fakturaer på minutter. For enkeltpersonforetak og småbedrifter som trenger en faktura i ny og ne. Ingen abonnement nødvendig.',
  keywords: ['faktura', 'fakturering', 'regning', 'enkeltforetak', 'småbedrift', 'fakturaprogram', 'norge', 'faktura online', 'lag faktura'],
  authors: [{ name: 'Fakturia', url: 'https://fakturia.no' }],
  creator: 'Fakturia',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://fakturia.no'),
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: '/',
    siteName: 'Fakturia',
    title: 'Fakturia — Enkel fakturering for småbedrifter',
    description: 'Lag og send profesjonelle fakturaer på minutter. Betal per faktura eller abonner.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Fakturia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fakturia — Enkel fakturering for småbedrifter',
    description: 'Lag og send profesjonelle fakturaer på minutter.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'nb-NO': '/',
      'en-US': '/en',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className="antialiased">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Fakturia',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Enkel fakturering for småbedrifter og enkeltpersonforetak',
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '49',
                highPrice: '499',
                priceCurrency: 'NOK',
                offerCount: 4,
              },
              pricing: '49 NOK per invoice, or subscription from 149 NOK/month',
              featureList: [
                'Create and send invoices',
                'One-off or subscription pricing',
                'AI API for automated invoicing',
                'Email delivery',
                'PDF generation',
                'Client management',
                'Payment tracking',
              ],
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
