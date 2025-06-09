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
    company: ''
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

      const { error } = await supabase
        .from('clients')
        .insert({
          ...formData,
          user_id: user.id
        });

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
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('Add New Client')}</h1>
          <Link href="/clients">
            <Button variant="outline">{t('Cancel')}</Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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