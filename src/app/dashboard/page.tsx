'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InvoiceWithDetails, Profile } from '@/types/database';
import { Coins } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

function handleBuyInvoicePoint() {
  fetch('/api/create-checkout-session', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        // handle error
        alert('Failed to start checkout');
      }
    });
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setInvoices([]);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id);
      if (!invoicesError) setInvoices(invoicesData || []);

      // Fetch user profile for invoice points
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

      setLoading(false);
    };
    fetchData();
  }, []);

  // Count invoices by status
  const statusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('Welcome,')} {user?.email}</CardTitle>
          <CardDescription>{t("Here's an overview of your account")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invoice Points Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Coins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">{t('Invoice Points')}</h3>
                  <p className="text-sm text-blue-700">
                    {loading ? (
                      t('Loading...')
                    ) : (
                      `${t('Available Points')}: ${profile?.invoice_points || 0}`
                    )}
                  </p>
                </div>
              </div>
              <Button onClick={handleBuyInvoicePoint} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                {t('Buy Invoice Points')}
              </Button>
            </div>
          </div>

          {/* Active Invoices Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">{t('Active Invoices')}</h2>
            {loading ? (
              <div>{t('Loading...')}</div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {Object.keys(statusCounts).length === 0 ? (
                  <span className="text-muted-foreground">{t('No invoices found.')}</span>
                ) : (
                  Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <Badge className={
                        status in statusColors
                          ? statusColors[status as keyof typeof statusColors]
                          : ''
                      }>
                        {t(status.charAt(0).toUpperCase() + status.slice(1))}
                      </Badge>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 