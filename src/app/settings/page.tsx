'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { t } from '@/lib/i18n';

interface CompanySettings {
  id: string;
  user_id: string;
  company_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  email: string;
  website: string | null;
  bank_account: string | null;
  notes: string | null;
  organization_number: string | null;
  is_company_registered: boolean;
  vat_registered: boolean;
  vat_number: string | null;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    bank_account: '',
    notes: '',
    organization_number: '',
    is_company_registered: false,
    vat_registered: false,
    vat_number: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('You must be logged in to view settings'));
          router.push('/sign-in');
          return;
        }

        const { data, error } = await supabase
          .from('company_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }

        if (data) {
          setSettings(data);
          setFormData({
            company_name: data.company_name,
            address_line1: data.address_line1,
            address_line2: data.address_line2 || '',
            city: data.city,
            state: data.state,
            postal_code: data.postal_code,
            country: data.country,
            phone: data.phone || '',
            email: data.email,
            website: data.website || '',
            bank_account: data.bank_account || '',
            notes: data.notes || '',
            organization_number: data.organization_number || '',
            is_company_registered: data.is_company_registered,
            vat_registered: data.vat_registered,
            vat_number: data.vat_number || '',
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error(t('Failed to load settings'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('You must be logged in to save settings'));
        return;
      }

      const settingsData = {
        user_id: user.id,
        company_name: formData.company_name,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        phone: formData.phone || null,
        email: formData.email,
        website: formData.website || null,
        bank_account: formData.bank_account || null,
        notes: formData.notes || null,
        organization_number: formData.organization_number || null,
        is_company_registered: formData.is_company_registered,
        vat_registered: formData.vat_registered,
        vat_number: formData.vat_number || null,
      };

      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('company_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('company_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      toast.success(t('Settings saved successfully'));
      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('Company Settings')}</h1>
          <p className="text-muted-foreground">
            {t('Configure your company information for invoices')}
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="company_name">{t('Company Name *')}</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder={t('Enter company name')}
              />
            </div>

            <div>
              <Label htmlFor="organization_number">{t('Organization Number')}</Label>
              <Input
                id="organization_number"
                value={formData.organization_number}
                onChange={(e) => setFormData({ ...formData, organization_number: e.target.value })}
                placeholder={t('Organization Number')}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_company_registered"
                  checked={formData.is_company_registered}
                  onChange={(e) => setFormData({ ...formData, is_company_registered: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_company_registered">{t('Company is registered in Foretaksregisteret')}</Label>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="vat_registered"
                  checked={formData.vat_registered}
                  onChange={(e) => setFormData({ ...formData, vat_registered: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="vat_registered">{t('Company is registered for VAT')}</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="vat_number">{t('VAT Number')}</Label>
              <Input
                id="vat_number"
                value={formData.vat_number}
                onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                placeholder={t('VAT Number')}
                disabled={!formData.vat_registered}
              />
            </div>

            <div>
              <Label htmlFor="email">{t('Email *')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('Email')}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('Phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('Phone')}
              />
            </div>

            <div>
              <Label htmlFor="website">{t('Website')}</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder={t('Website')}
              />
            </div>


            <div>
              <Label htmlFor="bank_account">{t('Bank Account')}</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder={t('Bank account details')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('Address')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="address_line1">{t('Address Line 1 *')}</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder={t('Street address')}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address_line2">{t('Address Line 2')}</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder={t('Apartment, suite, unit, etc.')}
                />
              </div>

              <div>
                <Label htmlFor="city">{t('City *')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('City')}
                />
              </div>

              <div>
                <Label htmlFor="state">{t('State/Province *')}</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder={t('State or province')}
                />
              </div>

              <div>
                <Label htmlFor="postal_code">{t('Postal Code *')}</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder={t('Postal code')}
                />
              </div>

              <div>
                <Label htmlFor="country">{t('Country *')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder={t('Country')}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">{t('Additional Notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('Any additional information to include on invoices')}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 