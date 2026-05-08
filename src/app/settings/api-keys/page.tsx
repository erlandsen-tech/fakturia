'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Trash2, KeyRound, ArrowLeft } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/api-keys');
    if (res.ok) {
      const { data } = await res.json();
      setKeys(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErrorMessage(null);

    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName || undefined }),
    });

    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setErrorMessage(data.error || 'Kunne ikke opprette nøkkel');
      return;
    }

    setRevealedKey(data.data.key);
    setNewName('');
    load();
  }

  async function handleRevoke(id: string) {
    if (!confirm('Er du sikker? Tjenester som bruker denne nøkkelen vil slutte å virke.')) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Nøkkel deaktivert');
      load();
    } else {
      toast.error('Kunne ikke deaktivere nøkkel');
    }
  }

  function copyKey() {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    toast.success('Nøkkel kopiert');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/settings" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Tilbake til innstillinger
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <KeyRound className="w-7 h-7" /> API-nøkler
          </h1>
          <p className="text-muted-foreground mt-2">
            Bruk API-nøkler for å lage fakturaer programmatisk. Hver faktura som sendes via API trekker én faktura fra pakken din.
          </p>
        </div>

        {revealedKey && (
          <Card className="mb-6 border-emerald-300 bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-900">Ny nøkkel opprettet</CardTitle>
              <CardDescription className="text-emerald-800">
                Kopier nøkkelen nå — den vil ikke vises igjen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white border rounded text-sm font-mono break-all">
                  {revealedKey}
                </code>
                <Button onClick={copyKey} size="icon" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={() => setRevealedKey(null)} variant="ghost" size="sm" className="mt-3">
                Lukk
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Opprett ny nøkkel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="key-name">Navn (valgfritt)</Label>
                <Input
                  id="key-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="f.eks. Min AI-bot"
                  maxLength={100}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Oppretter…' : 'Opprett nøkkel'}
              </Button>
            </form>
            {errorMessage && (
              <p className="text-sm text-red-600 mt-3">{errorMessage}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktive nøkler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Laster…</p>
            ) : keys.length === 0 ? (
              <p className="text-muted-foreground">Ingen nøkler ennå.</p>
            ) : (
              <ul className="divide-y">
                {keys.map((k) => (
                  <li key={k.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{k.name || 'Uten navn'}</span>
                        {!k.is_active && <Badge variant="outline" className="text-xs">Deaktivert</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">
                        {k.key_prefix}••• · opprettet {new Date(k.created_at).toLocaleDateString('nb-NO')}
                        {k.last_used_at && ` · sist brukt ${new Date(k.last_used_at).toLocaleDateString('nb-NO')}`}
                      </div>
                    </div>
                    {k.is_active && (
                      <Button onClick={() => handleRevoke(k.id)} variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
