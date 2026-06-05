'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Plus, Trash2, Save, Send, Coins, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, InvoiceStatus, Profile, Product } from '@/types/database';
import { t } from '@/lib/i18n';
import { Wordmark } from '@/components/brand/Wordmark';
import { ChecksCard } from '@/components/invoices/ChecksCard';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  vat_rate: number;
  vat_amount: number;
}

export default function CreateInvoicePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as InvoiceStatus,
    notes: '',
    delivery_time: '',
    delivery_place: '',
    vat_rate: 25.00,
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0, vat_rate: 25.00, vat_amount: 0 }
  ]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Load user profile for invoice points
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      setProfileLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!profileError && profileData) {
        setProfile(profileData);
      } else if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }
      setProfileLoading(false);
    };

    loadProfile();
  }, [user, supabase]);

  // Load clients on component mount
  useEffect(() => {
    const loadClients = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        toast.error(t('Failed to load clients'));
        console.error('Error loading clients:', error);
      } else {
        setClients(data || []);
      }
    };

    loadClients();
  }, [user, supabase]);

  // Load products for the per-line product picker
  useEffect(() => {
    const loadProducts = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts(data || []);
      }
    };

    loadProducts();
  }, [user, supabase]);

  // Load company settings
  useEffect(() => {
    const loadCompanySettings = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading company settings:', error);
      } else {
        setCompanySettings(data);
        // A non-VAT-registered seller must not charge MVA. Drive the default rate
        // to 0 (the create route also enforces this server-side regardless).
        if (data && data.vat_registered === false) {
          setFormData((prev) => ({ ...prev, vat_rate: 0 }));
          setItems((prev) => prev.map((it) => ({ ...it, vat_rate: 0, vat_amount: 0 })));
        }
      }
    };

    loadCompanySettings();
  }, [user, supabase]);

  // Calculate item amounts including VAT
  const updateItemAmount = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate amount and VAT for this item
    if (field === 'quantity' || field === 'unit_price' || field === 'vat_rate') {
      const subtotal = newItems[index].quantity * newItems[index].unit_price;
      newItems[index].amount = subtotal;
      newItems[index].vat_amount = subtotal * (newItems[index].vat_rate / 100);
    }
    
    setItems(newItems);
  };

  // Prefill a line from a saved product (description / price / VAT / unit).
  const applyProduct = (index: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    // Respect the seller's VAT status: a non-registered seller's lines stay 0%.
    const sellerRegistered = companySettings?.vat_registered !== false;
    const vat_rate = sellerRegistered ? (Number(p.vat_rate) || 0) : 0;
    const unit_price = Number(p.unit_price) || 0;
    const newItems = [...items];
    const subtotal = newItems[index].quantity * unit_price;
    newItems[index] = {
      ...newItems[index],
      description: (p.description && p.description.trim()) || p.name,
      unit_price,
      vat_rate,
      amount: subtotal,
      vat_amount: subtotal * (vat_rate / 100),
    };
    setItems(newItems);
  };

  // Add new item row
  const addItem = () => {
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      amount: 0, 
      vat_rate: formData.vat_rate, 
      vat_amount: 0 
    }]);
  };

  // Remove item row
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const subtotalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const totalVatAmount = items.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
  const totalAmount = subtotalAmount + totalVatAmount;

  // Check if user has enough points
  const hasEnoughPoints = () => {
    return profile && profile.invoice_points > 0;
  };

  // Handle buying invoice points → route to pricing page
  const handleBuyInvoicePoints = () => {
    router.push('/pricing');
  };

  // Save invoice via /api/invoices. Drafts are free; sending costs 1 point
  // (deducted server-side via PATCH action=send).
  const saveInvoice = async (status: InvoiceStatus = 'draft') => {
    if (!user) {
      toast.error(t('You must be logged in to create an invoice'));
      return;
    }
    if (!formData.client_id) {
      toast.error(t('Please select a client'));
      return;
    }
    if (items.some(item => !item.description.trim())) {
      toast.error(t('Please fill in all item descriptions'));
      return;
    }
    if (status === 'sent' && !hasEnoughPoints()) {
      toast.error(t('You need at least 1 invoice point to send an invoice'));
      return;
    }

    setLoading(true);
    try {
      // Step 1: create as draft
      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: formData.client_id,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          notes: formData.notes || null,
          delivery_time: formData.delivery_time || null,
          delivery_place: formData.delivery_place || null,
          vat_rate: formData.vat_rate,
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            vat_rate: i.vat_rate,
          })),
        }),
      });
      const createBody = await createRes.json();
      if (!createRes.ok) {
        toast.error(createBody.error || t('Failed to create invoice'));
        return;
      }
      const invoiceId = createBody.data.id;

      // Step 2: if user clicked "Send", PATCH to send (deducts a point atomically)
      if (status === 'sent') {
        const sendRes = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send' }),
        });
        const sendBody = await sendRes.json();
        if (!sendRes.ok) {
          toast.error(sendBody.error || t('Invoice created but failed to send'));
          // Still navigate — invoice exists as draft
        } else {
          if (typeof sendBody.data?.remaining_points === 'number') {
            setProfile((prev) => prev ? { ...prev, invoice_points: sendBody.data.remaining_points } : prev);
          }
        }
      }

      toast.success(t(status === 'draft' ? 'Invoice saved as draft successfully!' : 'Invoice created and sent successfully!'));
      router.push('/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(t('Failed to create invoice'));
    } finally {
      setLoading(false);
    }
  };

  const preflight = [
    { ok: !!formData.client_id, label: 'Kunde valgt' },
    { ok: items.some((i) => i.description.trim().length > 0), label: 'Minst én linje med beskrivelse' },
    { ok: items.every((i) => i.unit_price > 0), label: 'Alle linjer har en pris' },
    { ok: !!formData.due_date, label: 'Forfallsdato satt' },
    { ok: !!hasEnoughPoints(), label: 'Du har nok fakturapoeng' },
  ];

  return (
    <div className="bg-paper-grain min-h-screen px-6 lg:px-12 py-8">
      <div className="max-w-7xl mx-auto">
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 text-ink-3">
            <Link href="/invoices" className="hover:text-ink">← Fakturaer</Link>
            <span>·</span>
            <span className="font-display text-[22px] text-ink">Ny faktura</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => saveInvoice('draft')} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {t('Save as Draft')}
            </Button>
            <Button variant="clay" type="button" onClick={() => saveInvoice('sent')} disabled={loading || !hasEnoughPoints()}>
              <Send className="h-4 w-4 mr-2" />
              {t('Create & Send')} →
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* PAPER CARD with the form */}
          <div className="bg-white px-10 lg:px-14 py-12 shadow-paper border border-ink/8">
            <div className="flex justify-between mb-9">
              <div>
                <Wordmark size={0.9} />
                {companySettings && (
                  <div className="text-xs text-ink-3 mt-2">
                    {companySettings.company_name} · {companySettings.address_line1}
                    {companySettings.organization_number ? ` · ${companySettings.organization_number}` : ''}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="cap text-ink-mute">Faktura</div>
                <div className="font-mono text-[20px] mt-0.5">Ny</div>
              </div>
            </div>
            <hr className="hairline mb-6" />
      <div className="mb-8 hidden">
        <h1 className="text-3xl font-bold">{t('Create New Invoice')}</h1>
        <p className="text-muted-foreground">{t('Fill in the details below to create a new invoice')}</p>
      </div>

      {/* Invoice Points Status */}
      <div className="mb-6">
        {profileLoading ? (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-gray-500" />
              <span className="text-gray-600">{t('Loading...')}</span>
            </div>
          </div>
        ) : !hasEnoughPoints() ? (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    {t('Insufficient Invoice Points')}
                  </h3>
                  <p className="text-sm text-red-700">
                    {t('You need at least 1 invoice point to create an invoice.')} 
                    {' '}
                    {t('Available Points')}: {profile?.invoice_points || 0}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleBuyInvoicePoints}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t('Buy Invoice Points')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">{t('Invoice Points')}</h3>
                <p className="text-sm text-green-700">
                  {t('Available Points')}: {profile?.invoice_points || 0}
                  {' '}
                  (1 {t('point will be deducted when creating this invoice')})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Invoice Details */}
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">{t('Invoice Details')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client">{t('Client')} *</Label>
              <Select value={formData.client_id} onValueChange={(value) => {
                if (value === 'add_new_client') {
                  router.push('/clients/new?redirect_to=/invoices/create');
                } else {
                  setFormData({ ...formData, client_id: value });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a client')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </SelectItem>
                  ))}
                  <SelectItem value="add_new_client" className="text-primary font-medium border-t mt-1 pt-2">
                    <div className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('Create new client')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">{t('Status')}</Label>
              <Select value={formData.status} onValueChange={(value: InvoiceStatus) => setFormData({ ...formData, status: value })}>
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
              <Label htmlFor="issue_date">{t('Issue Date')} *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="due_date">{t('Due Date')} *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
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
              <Label htmlFor="vat_rate">{t('Default VAT Rate (%)')}</Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
              />
              {companySettings && companySettings.vat_registered === false && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Du er ikke MVA-registrert — fakturalinjer settes til 0% MVA.')}
                </p>
              )}
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{t('Invoice Items')}</h2>
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('Add Item')}
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-4">
                  <Label>{t('Description')} *</Label>
                  {products.length > 0 && (
                    <Select value="" onValueChange={(v) => applyProduct(index, v)}>
                      <SelectTrigger className="mb-2">
                        <SelectValue placeholder={t('Velg produkt (valgfri)')} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.product_number ? ` · ${p.product_number}` : ''} · {Number(p.unit_price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    placeholder={t('Item description')}
                    value={item.description}
                    onChange={(e) => updateItemAmount(index, 'description', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('Quantity')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItemAmount(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('Unit Price')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItemAmount(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('VAT Rate (%)')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={item.vat_rate}
                    onChange={(e) => updateItemAmount(index, 'vat_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    onClick={() => removeItem(index)}
                    variant="outline"
                    size="sm"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end">
              <div className="text-right space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t('Subtotal')}: {subtotalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('VAT')}: {totalVatAmount.toFixed(2)}
                </div>
                <div className="text-lg font-semibold">
                  {t('Total')}: {totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        {companySettings && (
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">{t('Company Information')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('Company Name')}</Label>
                <div className="text-sm">{companySettings.company_name}</div>
              </div>
              <div>
                <Label>{t('Organization Number')}</Label>
                <div className="text-sm">{companySettings.organization_number}</div>
              </div>
              <div>
                <Label>{t('Address')}</Label>
                <div className="text-sm">
                  {companySettings.address_line1}
                  {companySettings.address_line2 && <br />}
                  {companySettings.address_line2}
                  <br />
                  {companySettings.postal_code} {companySettings.city}
                  <br />
                  {companySettings.country}
                </div>
              </div>
              <div>
                <Label>{t('Contact')}</Label>
                <div className="text-sm">
                  {companySettings.phone && <div>{t('Phone')}: {companySettings.phone}</div>}
                  <div>{t('Email')}: {companySettings.email}</div>
                  {companySettings.website && <div>{t('Website')}: {companySettings.website}</div>}
                </div>
              </div>
              {companySettings.vat_registered && (
                <div className="md:col-span-2">
                  <Label>{t('VAT Information')}</Label>
                  <div className="text-sm">
                    {t('VAT Number')}: {companySettings.vat_number}
                    {companySettings.is_company_registered && <div>{t('Registered in Foretaksregisteret')}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            onClick={() => router.push('/invoices')}
            variant="outline"
            disabled={loading}
          >
            {t('Cancel')}
          </Button>
        </div>
      </div>
          </div>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-5">
            <ChecksCard items={preflight} />
            <p className="px-4 text-xs text-ink-3 leading-[1.6] border-t border-ink/10 pt-4">
              Når du trykker <strong>Send</strong> får mottakeren en e-post med fakturaen som PDF og en lenke til en lesbar versjon med bankkonto og KID.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}