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

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit_price: 0,
    vat_rate: 25,
    unit: 'stk',
    product_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t('You must be logged in to create a product'));
        return;
      }

      const payload: Record<string, unknown> = {
        user_id: user.id,
        name: formData.name,
        unit_price: formData.unit_price,
        vat_rate: formData.vat_rate,
        unit: formData.unit.trim() || 'stk',
      };
      if (formData.description.trim()) payload.description = formData.description.trim();
      if (formData.product_number.trim()) payload.product_number = formData.product_number.trim();

      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;

      toast.success(t('Product created successfully!'));
      router.push('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(t('Failed to create product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('Add New Product')}</h1>
          <Link href="/products">
            <Button variant="outline">{t('Cancel')}</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('Name')} *</Label>
            <Input
              id="name"
              placeholder={t('e.g. Konsulenttime')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <textarea
              id="description"
              className="w-full p-2 border rounded-md resize-none"
              rows={3}
              placeholder={t('Optional description that prefills the invoice line')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">{t('Unit Price')} (NOK) *</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">{t('Unit')}</Label>
              <Input
                id="unit"
                placeholder="stk / time / dag"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_number">{t('Product No.')}</Label>
              <Input
                id="product_number"
                placeholder="K-001"
                value={formData.product_number}
                onChange={(e) => setFormData({ ...formData, product_number: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href="/products">
              <Button variant="outline">{t('Cancel')}</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? t('Creating...') : t('Create Product')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
