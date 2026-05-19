'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import type { Client } from '@/types/database';
import { t } from '@/lib/i18n';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('You must be logged in to view clients'));
          return;
        }

        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;

        setClients(data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast.error(t('Failed to load clients'));
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <h1 className="text-3xl font-bold">{t('Clients')}</h1>
        <Link href="/clients/new" className="self-start sm:self-auto">
          <Button>{t('Add New Client')}</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-4 text-center text-gray-500">{t('Loading clients...')}</div>
        ) : clients.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {t('No clients found. Add your first client to get started.')}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="font-medium text-primary">{client.name}</div>
                  {client.company && (
                    <div className="text-sm text-gray-600 mt-0.5">{client.company}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-1 break-all">{client.email}</div>
                  {client.phone && (
                    <div className="text-sm text-gray-600">{client.phone}</div>
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">{t('Name')}</th>
                    <th className="text-left p-4">{t('Company')}</th>
                    <th className="text-left p-4">{t('Email')}</th>
                    <th className="text-left p-4">{t('Phone')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Link href={`/clients/${client.id}`} className="text-primary hover:underline">
                          {client.name}
                        </Link>
                      </td>
                      <td className="p-4">{client.company || t('-')}</td>
                      <td className="p-4">{client.email}</td>
                      <td className="p-4">{client.phone || t('-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}