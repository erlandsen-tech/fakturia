'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Copy } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { InvoiceWithDetails } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleClone = async (id: string) => {
    setCloningId(id);
    try {
      const res = await fetch(`/api/invoices/${id}/clone`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const { data } = await res.json();
      toast.success(t('Faktura kopiert'));
      router.push(`/invoices/${data.id}`);
    } catch (e) {
      console.error('Clone failed:', e);
      toast.error(t('Kunne ikke kopiere faktura'));
    } finally {
      setCloningId(null);
    }
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('You must be logged in to view invoices'));
          return;
        }

        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            client:clients(*),
            items:invoice_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast.error(t('Failed to load invoices'));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('Invoices')}</h1>
          <p className="text-muted-foreground">{t('Manage your invoices and track payments')}</p>
        </div>
        <Link href="/invoices/create" className="self-start sm:self-auto">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('Create Invoice')}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8">{t('Loading invoices...')}</div>
      ) : invoices.length === 0 ? (
        <div className="bg-card p-8 rounded-lg border text-center">
          <h2 className="text-xl font-semibold mb-2">{t('No invoices yet')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('Create your first invoice to get started with billing your clients.')}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          {/* Mobile card list */}
          <div className="sm:hidden divide-y">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start gap-3">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {invoice.invoice_number}
                  </Link>
                  <Badge className={statusColors[invoice.status]}>
                    {t(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1))}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{invoice.client.name}</div>
                <div className="flex justify-between items-end gap-3 mt-2">
                  <div className="text-xs text-muted-foreground">
                    {t('Due Date')}: {new Date(invoice.due_date).toLocaleDateString()}
                  </div>
                  <div className="font-mono text-sm">{invoice.total_amount.toFixed(2)}</div>
                </div>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleClone(invoice.id)}
                    disabled={cloningId === invoice.id}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('Kopier som ny kladd')}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">{t('Invoice #')}</th>
                  <th className="text-left p-4">{t('Client')}</th>
                  <th className="text-left p-4">{t('Date')}</th>
                  <th className="text-left p-4">{t('Due Date')}</th>
                  <th className="text-left p-4">{t('Amount')}</th>
                  <th className="text-left p-4">{t('Status')}</th>
                  <th className="text-right p-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="p-4">{invoice.client.name}</td>
                    <td className="p-4">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                    <td className="p-4">{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td className="p-4">{invoice.total_amount.toFixed(2)}</td>
                    <td className="p-4">
                      <Badge className={statusColors[invoice.status]}>
                        {t(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1))}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('Kopier som ny kladd')}
                        onClick={() => handleClone(invoice.id)}
                        disabled={cloningId === invoice.id}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 