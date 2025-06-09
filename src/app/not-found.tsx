import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <h1 className="text-5xl font-bold mb-4">{t('404')}</h1>
      <p className="text-lg mb-6 text-muted-foreground">{t('Page not found')}</p>
      <Link href="/dashboard">
        <button className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition">
          {t('Back to dashboard')}
        </button>
      </Link>
    </div>
  );
} 