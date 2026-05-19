'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

export default function NewClientPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    org_number: '',
    address_line1: '',
    address_line2: '',
    postal_code: '',
    city: '',
    country: 'NO',
    vat_number: '',
    peppol_endpoint: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('You must be logged in to create a client'));
        return;
      }

      // Strip empty strings so optional columns stay NULL instead of ''
      const payload: Record<string, unknown> = { user_id: user.id };
      for (const [k, v] of Object.entries(formData)) {
        if (typeof v === 'string' && v.trim() === '') continue;
        payload[k] = v;
      }
      const { error } = await supabase.from('clients').insert(payload);

      if (error) throw error;

      toast.success(t('Client created successfully!'));
      router.push('/clients');
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error(t('Failed to create client'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('Add New Client')}</h1>
          <Link href="/clients">
            <Button variant="outline">{t('Cancel')}</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">{t('Company Name')}</Label>
                <Input 
                  id="company" 
                  placeholder={t('Enter company name')}
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t('Contact Name')}</Label>
                <Input 
                  id="name" 
                  placeholder={t('Enter contact name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder={t('Enter email address')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('Phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('Enter phone number')}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t('EHF / e-invoice')}
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                {t('Required to generate an EHF e-invoice for this client. Optional otherwise.')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org_number">{t('Organisasjonsnummer')}</Label>
                  <Input
                    id="org_number"
                    placeholder="999888777"
                    value={formData.org_number}
                    onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat_number">{t('MVA-nummer')}</Label>
                  <Input
                    id="vat_number"
                    placeholder="NO999888777MVA"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="address_line1">{t('Adresse')}</Label>
                <Input
                  id="address_line1"
                  placeholder={t('Gatenavn 1')}
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                />
              </div>
              <div className="space-y-2 mt-2">
                <Input
                  id="address_line2"
                  placeholder={t('Adresselinje 2 (valgfri)')}
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">{t('Postnummer')}</Label>
                  <Input
                    id="postal_code"
                    placeholder="0150"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('Poststed')}</Label>
                  <Input
                    id="city"
                    placeholder="Oslo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('Land (ISO-2)')}</Label>
                  <Input
                    id="country"
                    placeholder="NO"
                    maxLength={2}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="peppol_endpoint">{t('PEPPOL-endepunkt')}</Label>
                <Input
                  id="peppol_endpoint"
                  placeholder="0192:999888777"
                  value={formData.peppol_endpoint}
                  onChange={(e) => setFormData({ ...formData, peppol_endpoint: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('Vanligvis "0192:" + organisasjonsnummer for norske mottakere.')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href="/clients">
              <Button variant="outline">{t('Cancel')}</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? t('Creating...') : t('Create Client')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 