'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Client, InvoiceWithDetails } from '@/types/database';
import { ArrowLeft, Save, Plus, Trash } from 'lucide-react';
import Link from 'next/link';
import { t } from '@/lib/i18n';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('You must be logged in to view clients'));
          router.push('/sign-in');
          return;
        }

        // Fetch client details
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', params.id)
          .single();

        if (clientError) throw clientError;

        if (!clientData) {
          toast.error(t('Client not found'));
          router.push('/clients');
          return;
        }

        setClient(clientData);
        setFormData({
          name: clientData.name,
          company: clientData.company || '',
          email: clientData.email,
          phone: clientData.phone || '',
        });

        // Fetch client's invoices
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            *,
            client:clients(*),
            items:invoice_items(*)
          `)
          .eq('client_id', params.id)
          .order('created_at', { ascending: false });

        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData || []);

      } catch (error) {
        console.error('Error fetching client data:', error);
        toast.error(t('Failed to load client data'));
        router.push('/clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [params.id]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          company: formData.company || null,
          email: formData.email,
          phone: formData.phone || null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast.success(t('Client updated successfully'));
      router.refresh();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error(t('Failed to update client'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client || invoices.length > 0) return;
    if (!confirm(t('Are you sure you want to delete this client? This action cannot be undone.'))) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);
      if (error) throw error;
      toast.success(t('Client deleted successfully'));
      router.push('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(t('Failed to delete client'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t('Loading client data...')}</div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/clients" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to Clients')}
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            {client.company && (
              <p className="text-muted-foreground">{client.company}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Link href={`/invoices/create?client_id=${client.id}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('New Invoice')}
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('Saving...') : t('Save Changes')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={invoices.length > 0 || deleting}
              title={invoices.length > 0 ? t('Cannot delete client with invoices') : ''}
            >
              <Trash className="h-4 w-4 mr-2" />
              {deleting ? t('Deleting...') : t('Delete')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Client Details */}
        <div className="md:col-span-1">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Client Information')}</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="company">{t('Company')}</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder={t('Optional')}
                />
              </div>

              <div>
                <Label htmlFor="email">{t('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('Phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('Optional')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Client's Invoices */}
        <div className="md:col-span-2">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Invoices')}</h2>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('No invoices found for this client.')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('Invoice #')}</th>
                      <th className="text-left p-2">{t('Date')}</th>
                      <th className="text-left p-2">{t('Due Date')}</th>
                      <th className="text-left p-2">{t('Status')}</th>
                      <th className="text-right p-2">{t('Amount')}</th>
                      <th className="text-right p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td className="p-2">{new Date(invoice.issue_date).toLocaleDateString()}</td>
                        <td className="p-2">{new Date(invoice.due_date).toLocaleDateString()}</td>
                        <td className="p-2">
                          <Badge className={statusColors[invoice.status]}>
                            {t(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1))}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">{invoice.total_amount.toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <Link 
                            href={`/invoices/${invoice.id}`}
                            className="text-primary hover:underline"
                          >
                            {t('View')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border mt-6">
        <h2 className="text-xl font-semibold mb-4">{t('Client Information')}</h2>
        <div className="space-y-4">
          <div>
            <Label>{t('Name')}</Label>
            <p className="font-medium">{client.name}</p>
          </div>
          {client.company && (
            <div>
              <Label>{t('Company')}</Label>
              <p className="font-medium">{client.company}</p>
            </div>
          )}
          <div>
            <Label>{t('Email')}</Label>
            <p className="font-medium">{client.email}</p>
          </div>
          {client.phone && (
            <div>
              <Label>{t('Phone')}</Label>
              <p className="font-medium">{client.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 