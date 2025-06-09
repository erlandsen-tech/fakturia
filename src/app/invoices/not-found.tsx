import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <h1 className="text-5xl font-bold mb-4">{t('Invoices not found')}</h1>
      <p className="text-lg mb-6 text-muted-foreground">{t('The requested invoices do not exist.')}</p>
      <Link href="/invoices">
        <button className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
          {t('Back to overview')}
        </button>
      </Link>
    </div>
  );
} 