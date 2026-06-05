'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Product } from '@/types/database';
import { t } from '@/lib/i18n';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast.error(t('You must be logged in to view products'));
          return;
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('name');

        if (error) throw error;

        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error(t('Failed to load products'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('Products')}</h1>
        <Link href="/products/new">
          <Button>{t('Add New Product')}</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-4 text-center text-gray-500">{t('Loading products...')}</div>
        ) : products.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {t('No products found. Add your first product to get started.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">{t('Name')}</th>
                  <th className="text-left p-4">{t('Product No.')}</th>
                  <th className="text-left p-4">{t('Unit')}</th>
                  <th className="text-right p-4">{t('Unit Price')}</th>
                  <th className="text-right p-4">{t('VAT')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <Link href={`/products/${product.id}`} className="text-primary hover:underline">
                        {product.name}
                      </Link>
                    </td>
                    <td className="p-4">{product.product_number || t('-')}</td>
                    <td className="p-4">{product.unit}</td>
                    <td className="p-4 text-right">{product.unit_price.toFixed(2)}</td>
                    <td className="p-4 text-right">{Number(product.vat_rate)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
