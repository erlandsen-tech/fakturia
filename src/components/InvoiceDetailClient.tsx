'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { InvoiceWithDetails, InvoiceStatus } from '@/types/database';
import { ArrowLeft, Save, Printer, Trash, Send } from 'lucide-react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/InvoicePDF';
import { createClient } from '@/utils/supabase/client';

interface InvoiceDetailClientProps {
  invoice: InvoiceWithDetails;
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    status: invoice.status,
    notes: invoice.notes || '',
    delivery_time: invoice.delivery_time || '',
    delivery_place: invoice.delivery_place || '',
    vat_rate: invoice.vat_rate || 25.00,
  });
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    const loadCompanySettings = async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', invoice.user_id)
        .single();
      if (!error) setCompanySettings(data);
    };
    loadCompanySettings();
  }, [invoice.user_id]);

  const handleSave = async () => {
    setSaving(true);

    try {
      console.log('Attempting to save invoice with data:', formData);
      
      // Prepare data for submission, converting empty strings to null for timestamp fields
      const submitData = {
        ...formData,
        delivery_time: formData.delivery_time.trim() === '' ? null : formData.delivery_time,
        notes: formData.notes.trim() === '' ? null : formData.notes,
        delivery_place: formData.delivery_place.trim() === '' ? null : formData.delivery_place,
      };
      
      console.log('Processed data for submission:', submitData);
      
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update invoice`);
      }

      const result = await response.json();
      console.log('Success response:', result);

      toast.success(t('Invoice updated successfully'));
      router.refresh();
    } catch (error) {
      console.error('Error updating invoice:', error);
      
      // More specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error(t('Network error. Please check your connection and try again.'));
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('Failed to update invoice'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (formData.status !== 'draft') {
      toast.error(t('Only draft invoices can be sent'));
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'send' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invoice');
      }

      // Update local state
      setFormData(prev => ({ ...prev, status: 'sent' }));
      
      toast.success(t('Invoice sent successfully'));
      router.refresh();
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error(t('Failed to send invoice'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('Are you sure you want to delete this invoice? This action cannot be undone.'))) {
      return;
    }
    
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }

      toast.success(t('Invoice deleted successfully'));
      router.push('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error(t('Failed to delete invoice'));
    } finally {
      setDeleting(false);
    }
  };

  // Calculate totals for display
  const subtotalAmount = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const totalVatAmount = invoice.items.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
  const totalAmount = subtotalAmount + totalVatAmount;

  // Check if invoice can be sent
  const canSendInvoice = formData.status === 'draft';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/invoices" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to Invoices')}
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{t('Invoice')} {invoice.invoice_number}</h1>
            <p className="text-muted-foreground">
              {t('Created on')} {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {companySettings && (
              <PDFDownloadLink
                document={
                  <InvoicePDF
                    company={{
                      name: companySettings.company_name,
                      address: [companySettings.address_line1, companySettings.address_line2].filter(Boolean).join(', '),
                      orgNumber: companySettings.organization_number,
                      email: companySettings.email,
                      phone: companySettings.phone,
                      website: companySettings.website,
                      slogan: companySettings.slogan,
                      logoUrl: companySettings.logo_url,
                    }}
                    client={{
                      name: invoice.client.name,
                      address: invoice.client.company || '',
                      postalCode: '',
                      city: '',
                      country: '',
                    }}
                    invoice={{
                      number: invoice.invoice_number,
                      date: invoice.issue_date,
                      orderNumber: '',
                      items: invoice.items.map((item, idx) => ({
                        number: String(idx + 1),
                        description: item.description,
                        quantity: item.quantity,
                        unit: 'Stk',
                        unitPrice: item.unit_price,
                        amount: item.amount,
                        vat: item.vat_rate || 25,
                      })),
                      notes: invoice.notes,
                      subtotal: subtotalAmount,
                      vat: totalVatAmount,
                      total: totalAmount,
                      currency: 'NOK',
                      paymentTerms: 'Betal online med kredittkort',
                    }}
                  />
                }
                fileName={`faktura_${invoice.invoice_number}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" disabled={loading}>
                    {loading ? t('Laster ned...') : t('Last ned PDF')}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            
            {canSendInvoice && (
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? t('Sending...') : t('Send Invoice')}
              </Button>
            )}
            
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('Saving...') : t('Save Changes')}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash className="h-4 w-4 mr-2" />
              {deleting ? t('Deleting...') : t('Delete')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Invoice Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Invoice Details')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">{t('Status')}</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: InvoiceStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('Draft')}</SelectItem>
                    <SelectItem value="sent">{t('Sent')}</SelectItem>
                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                    <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="issue_date">{t('Issue Date')}</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="due_date">{t('Due Date')}</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="delivery_time">{t('Delivery Time')}</Label>
                <Input
                  id="delivery_time"
                  type="datetime-local"
                  value={formData.delivery_time}
                  onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="delivery_place">{t('Delivery Place')}</Label>
                <Input
                  id="delivery_place"
                  value={formData.delivery_place}
                  onChange={(e) => setFormData({ ...formData, delivery_place: e.target.value })}
                  placeholder={t('Place of delivery')}
                />
              </div>

              <div>
                <Label htmlFor="vat_rate">{t('VAT Rate (%)')}</Label>
                <Input
                  id="vat_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">{t('Notes')}</Label>
              <textarea
                id="notes"
                className="w-full mt-1 p-2 border rounded-md resize-none"
                rows={3}
                placeholder={t('Additional notes or terms...')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Items')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">{t('Description')}</th>
                    <th className="text-right p-2">{t('Quantity')}</th>
                    <th className="text-right p-2">{t('Unit Price')}</th>
                    <th className="text-right p-2">{t('VAT Rate')}</th>
                    <th className="text-right p-2">{t('VAT Amount')}</th>
                    <th className="text-right p-2">{t('Amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">{item.unit_price.toFixed(2)}</td>
                      <td className="p-2 text-right">{item.vat_rate || 0}%</td>
                      <td className="p-2 text-right">{(item.vat_amount || 0).toFixed(2)}</td>
                      <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-semibold">{t('Subtotal')}:</td>
                    <td className="p-2 text-right font-semibold">{subtotalAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-semibold">{t('VAT')}:</td>
                    <td className="p-2 text-right font-semibold">{totalVatAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-semibold">{t('Total')}:</td>
                    <td className="p-2 text-right font-semibold">{totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Client Information')}</h2>
            <div className="space-y-4">
              <div>
                <Label>{t('Name')}</Label>
                <p className="font-medium">{invoice.client.name}</p>
              </div>
              {invoice.client.company && (
                <div>
                  <Label>{t('Company')}</Label>
                  <p className="font-medium">{invoice.client.company}</p>
                </div>
              )}
              <div>
                <Label>{t('Email')}</Label>
                <p className="font-medium">{invoice.client.email}</p>
              </div>
              {invoice.client.phone && (
                <div>
                  <Label>{t('Phone')}</Label>
                  <p className="font-medium">{invoice.client.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 