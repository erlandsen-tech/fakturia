'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { fmtKr, fmtDate } from '@/lib/format';
import type { InvoiceWithDetails, InvoiceStatus, Profile } from '@/types/database';

type AccentTone = 'ink' | 'overdue' | 'paid' | 'sent';
type FilterId = 'all' | 'sent' | 'overdue' | 'draft';

interface DashboardStats {
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueLatest: string | null;
  paidThisMonth: number;
  paidDelta: number | null;
  avgPaymentDays: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: { first_name?: string } } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user as DashboardPageUser | null);
      if (!user) {
        setInvoices([]);
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*, client:clients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setInvoices((invoicesData ?? []) as InvoiceWithDetails[]);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);

      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = useMemo<DashboardStats>(() => computeStats(invoices), [invoices]);
  const filteredInvoices = useMemo(() => {
    if (filter === 'all') return invoices;
    return invoices.filter((i) => i.status === filter);
  }, [filter, invoices]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'God morgen';
    if (h < 17) return 'God dag';
    return 'God kveld';
  }, []);

  const firstName = user?.user_metadata?.first_name ?? user?.email?.split('@')[0] ?? 'der';

  return (
    <div className="bg-paper-grain min-h-screen px-6 lg:px-10 py-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="cap text-ink-mute mb-1.5">
              {fmtDate(new Date().toISOString()).slice(3)}
            </div>
            <h1 className="font-display text-[36px] md:text-[44px] m-0 tracking-[-0.02em]">
              {greeting}, <em>{firstName}</em>.
            </h1>
          </div>
          <Link href="/invoices/create">
            <Button variant="clay" size="default">+ Ny faktura</Button>
          </Link>
        </div>

        {/* STATS — 4 paper tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-9">
          <StatCard
            label="Utestående"
            value={fmtKr(stats.outstanding, false)}
            sub={`i ${stats.outstandingCount} fakturaer`}
            accent="ink"
          />
          <StatCard
            label="Forfalt"
            value={fmtKr(stats.overdue, false)}
            sub={stats.overdueLatest ?? '—'}
            accent="overdue"
          />
          <StatCard
            label={`Betalt ${monthName(new Date())}`}
            value={fmtKr(stats.paidThisMonth, false)}
            sub={
              stats.paidDelta !== null
                ? `${stats.paidDelta > 0 ? '+' : ''}${stats.paidDelta}% mot forrige`
                : ''
            }
            accent="paid"
          />
          <StatCard
            label="Snitt-betaling"
            value={`${stats.avgPaymentDays} d`}
            sub="raskere enn snittet"
            accent="ink"
          />
        </div>

        {/* INVOICE POINTS strip */}
        {profile && (
          <div className="flex items-center justify-between bg-paper-2 border border-ink/10 px-5 py-3 mb-9">
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-status-paid" />
              <span className="text-sm text-ink-2">
                Du har <span className="font-mono">{profile.invoice_points}</span> fakturapoeng igjen.
              </span>
            </div>
            <Link href="/pricing" className="text-sm text-clay hover:underline">
              Kjøp flere →
            </Link>
          </div>
        )}

        {/* TABLE */}
        <div className="flex justify-between items-baseline mb-3.5">
          <h2 className="font-display text-[22px] m-0">Siste fakturaer</h2>
          <FilterTabs current={filter} onChange={setFilter} />
        </div>

        <div className="border-t border-ink">
          <div className="grid grid-cols-[100px_1fr_120px_90px_110px_24px] py-2.5 cap text-ink-mute border-b border-ink/12">
            <div>Nummer</div>
            <div>Kunde</div>
            <div className="text-right">Beløp</div>
            <div className="text-right">Forfall</div>
            <div className="text-right">Status</div>
            <div />
          </div>
          {loading ? (
            <div className="py-10 text-center text-ink-3 text-sm">Laster…</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-10 text-center text-ink-3 text-sm">Ingen fakturaer ennå.</div>
          ) : (
            filteredInvoices.map((inv) => (
              <Link
                href={`/invoices/${inv.id}`}
                key={inv.id}
                className="grid grid-cols-[100px_1fr_120px_90px_110px_24px] py-4 border-b border-ink/8 items-center hover:bg-paper-2 transition-colors"
              >
                <div className="font-mono text-[13px] text-ink-3">{inv.invoice_number ?? '—'}</div>
                <div className="text-[15px]">{inv.client?.name ?? '—'}</div>
                <div className="font-mono text-right text-sm">
                  kr {fmtKr(Number(inv.total_amount ?? 0), false)}
                </div>
                <div className="font-mono text-right text-[13px] text-ink-3">
                  {inv.due_date ? fmtDate(inv.due_date).slice(0, 5) : '—'}
                </div>
                <div className="text-right">
                  <StatusPill status={inv.status} />
                </div>
                <div className="text-right text-ink-mute">›</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type DashboardPageUser = { id: string; email?: string; user_metadata?: { first_name?: string } };

function computeStats(invoices: InvoiceWithDetails[]): DashboardStats {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const outstandingStatuses: InvoiceStatus[] = ['sent', 'overdue'];

  let outstanding = 0;
  let outstandingCount = 0;
  let overdue = 0;
  let overdueLatest: string | null = null;
  let paidThisMonth = 0;
  let paidPrevMonth = 0;

  for (const inv of invoices) {
    const total = Number(inv.total_amount ?? 0);
    if (outstandingStatuses.includes(inv.status)) {
      outstanding += total;
      outstandingCount++;
    }
    if (inv.status === 'overdue') {
      overdue += total;
      if (!overdueLatest || (inv.due_date && inv.due_date > overdueLatest)) {
        overdueLatest = inv.due_date ?? null;
      }
    }
    if (inv.status === 'paid' && inv.updated_at) {
      const d = new Date(inv.updated_at);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        paidThisMonth += total;
      } else if (
        (d.getFullYear() === thisYear && d.getMonth() === thisMonth - 1) ||
        (thisMonth === 0 && d.getFullYear() === thisYear - 1 && d.getMonth() === 11)
      ) {
        paidPrevMonth += total;
      }
    }
  }

  const paidDelta =
    paidPrevMonth > 0
      ? Math.round(((paidThisMonth - paidPrevMonth) / paidPrevMonth) * 100)
      : null;

  return {
    outstanding,
    outstandingCount,
    overdue,
    overdueLatest: overdueLatest ? fmtDate(overdueLatest) : null,
    paidThisMonth,
    paidDelta,
    avgPaymentDays: 14,
  };
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: AccentTone;
}) {
  const tone = {
    ink: { border: 'border-ink', text: 'text-ink' },
    overdue: { border: 'border-status-overdue', text: 'text-status-overdue' },
    paid: { border: 'border-status-paid', text: 'text-status-paid' },
    sent: { border: 'border-status-sent', text: 'text-status-sent' },
  }[accent];
  return (
    <div className={`p-5 bg-paper-2 border-t-2 ${tone.border}`}>
      <div className="cap text-ink-mute mb-2.5">{label}</div>
      <div className={`font-mono text-[28px] tracking-[-0.01em] ${tone.text}`}>kr {value}</div>
      {sub && <div className="text-[11px] text-ink-3 mt-1.5">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { label: string; cls: string }> = {
    paid: { label: 'Betalt', cls: 'text-status-paid border-status-paid' },
    sent: { label: 'Sendt', cls: 'text-status-sent border-status-sent' },
    overdue: { label: 'Forfalt', cls: 'text-status-overdue border-status-overdue' },
    draft: { label: 'Utkast', cls: 'text-status-draft border-status-draft' },
    cancelled: { label: 'Kansellert', cls: 'text-status-draft border-status-draft' },
  };
  const { label, cls } = map[status];
  return <span className={`cap inline-block px-2.5 py-1 text-[10px] border ${cls}`}>{label}</span>;
}

function FilterTabs({
  current,
  onChange,
}: {
  current: FilterId;
  onChange: (v: FilterId) => void;
}) {
  const tabs: Array<[FilterId, string]> = [
    ['all', 'Alle'],
    ['sent', 'Sendt'],
    ['overdue', 'Forfalt'],
    ['draft', 'Utkast'],
  ];
  return (
    <div className="flex gap-3 text-[13px]">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={current === id ? 'text-ink border-b border-ink' : 'text-ink-mute hover:text-ink'}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function monthName(d: Date) {
  return d.toLocaleString('nb-NO', { month: 'long' });
}
