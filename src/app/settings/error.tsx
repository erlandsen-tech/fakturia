'use client';

import { useEffect } from 'react';
import { t } from '@/lib/i18n';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Optionally log error to an error reporting service
    // console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <h1 className="text-4xl font-bold mb-4">{t('Error loading settings')}</h1>
      <p className="text-lg mb-6 text-muted-foreground">{t('Try again')}</p>
      <button
        className="px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
        onClick={() => reset()}
      >
        {t('Try again')}
      </button>
    </div>
  );
} 