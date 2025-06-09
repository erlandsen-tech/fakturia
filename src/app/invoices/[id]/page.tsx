import { notFound, redirect } from 'next/navigation';
import { fetchUserRecord } from '@/lib/auth';
import { InvoiceDetailClient } from '@/components/InvoiceDetailClient';
import type { InvoiceWithDetails } from '@/types/database';

interface InvoiceDetailPageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  try {
    const invoice = await fetchUserRecord<InvoiceWithDetails>(
      'invoices',
      params.id,
      `
        *,
        client:clients(*),
        items:invoice_items(*)
      `
    );

    if (!invoice) {
      notFound();
    }

    return <InvoiceDetailClient invoice={invoice} />;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    
    if (error instanceof Error && error.message.includes('redirect')) {
      redirect('/sign-in');
    }
    
    // For any other error, show not found
    notFound();
  }
} 