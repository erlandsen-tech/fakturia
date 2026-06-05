'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import { ArrowLeft, Save, Trash } from 'lucide-react';
import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit_price: 0,
    vat_rate: 25,
    unit: 'stk',
    product_number: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error(t('You must be logged in to view products'));
          router.push('/sign-in');
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        if (!data) {
          toast.error(t('Product not found'));
          router.push('/products');
          return;
        }

        setProduct(data);
        setFormData({
          name: data.name,
          description: data.description || '',
          unit_price: data.unit_price,
          vat_rate: Number(data.vat_rate),
          unit: data.unit || 'stk',
          product_number: data.product_number || '',
        });
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error(t('Failed to load product'));
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const nullIfBlank = (v: string) => (v.trim() === '' ? null : v);
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: nullIfBlank(formData.description),
          unit_price: formData.unit_price,
          vat_rate: formData.vat_rate,
          unit: formData.unit.trim() || 'stk',
          product_number: nullIfBlank(formData.product_number),
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(t('Product updated successfully'));
      router.refresh();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(t('Failed to update product'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm(t('Are you sure you want to delete this product? This action cannot be undone.'))) return;
    setDeleting(true);
    try {
      // Soft-delete: keep the row, drop it from the catalogue list.
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', product.id);
      if (error) throw error;
      toast.success(t('Product deleted successfully'));
      router.push('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(t('Failed to delete product'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">{t('Loading product...')}</div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/products" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('Back to Products')}
        </Link>
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center space-x-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('Saving...') : t('Save Changes')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash className="h-4 w-4 mr-2" />
              {deleting ? t('Deleting...') : t('Delete')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-card p-6 rounded-lg border space-y-4">
          <div>
            <Label htmlFor="name">{t('Name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('Description')}</Label>
            <textarea
              id="description"
              className="w-full p-2 border rounded-md resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('Optional')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_price">{t('Unit Price')} (NOK)</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">{t('Unit')}</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="product_number">{t('Product No.')}</Label>
              <Input
                id="product_number"
                value={formData.product_number}
                onChange={(e) => setFormData({ ...formData, product_number: e.target.value })}
                placeholder={t('Optional')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
