'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('Welcome,')} {user?.email}</CardTitle>
          <CardDescription>{t("Here's an overview of your account")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add your dashboard content here */}
        </CardContent>
      </Card>
    </div>
  );
} 