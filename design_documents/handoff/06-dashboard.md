# 06 - Dashboard

The current dashboard mostly works - this chapter is a **restyle**, not a rewrite. Replace the slate cards with the paper aesthetic, swap the table chrome for the brand's ink underline + clay status pills, and add the warm "Good morning" greeting in italic serif.

## File: `src/app/dashboard/page.tsx` (REPLACE inner JSX; keep data fetching as-is)

The existing file fetches invoices + stats. Keep that logic; replace the JSX between the data hooks and the close of the component:

```tsx
// (keep imports, data fetching unchanged; add:)
import { Button } from "@/components/ui/button";
import { fmtKr, fmtDate } from "@/lib/format";
import Link from "next/link";

// inside the component, after data is loaded:
const greeting = (() => {
  const h = new Date().getHours();
  if (h < 11) return "God morgen";
  if (h < 17) return "God dag";
  return "God kveld";
})();

return (
  <div className="bg-paper-grain min-h-screen px-6 lg:px-10 py-8 max-w-7xl mx-auto">
    {/* HEADER */}
    <div className="flex justify-between items-start mb-8">
      <div>
        <div className="cap text-ink-mute mb-1.5">{fmtDate(new Date().toISOString()).slice(3)}</div>
        <h1 className="font-display text-[36px] md:text-[44px] m-0 tracking-[-0.02em]">
          {greeting}, <em>{user.first_name ?? "der"}</em>.
        </h1>
      </div>
      <Link href="/invoices/create">
        <Button variant="clay" size="default">+ Ny faktura</Button>
      </Link>
    </div>

    {/* STATS - 4 paper tiles */}
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
        sub={stats.overdueLatest ?? "-"}
        accent="overdue"
      />
      <StatCard
        label={`Betalt ${monthName(new Date())}`}
        value={fmtKr(stats.paidThisMonth, false)}
        sub={stats.paidDelta ? `${stats.paidDelta > 0 ? "+" : ""}${stats.paidDelta}% mot forrige` : ""}
        accent="paid"
      />
      <StatCard
        label="Snitt-betaling"
        value={`${stats.avgPaymentDays} d`}
        sub="raskere enn snittet"
        accent="ink"
      />
    </div>

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
      {invoices.map((inv) => (
        <Link
          href={`/invoices/${inv.id}`}
          key={inv.id}
          className="grid grid-cols-[100px_1fr_120px_90px_110px_24px] py-4 border-b border-ink/8 items-center hover:bg-paper-2 transition-colors"
        >
          <div className="font-mono text-[13px] text-ink-3">{inv.number}</div>
          <div className="text-[15px]">{inv.client_name}</div>
          <div className="font-mono text-right text-sm">kr {fmtKr(inv.amount, false)}</div>
          <div className="font-mono text-right text-[13px] text-ink-3">{inv.due_date ? fmtDate(inv.due_date).slice(0, 5) : "-"}</div>
          <div className="text-right">
            <StatusPill status={inv.status} />
          </div>
          <div className="text-right text-ink-mute">›</div>
        </Link>
      ))}
    </div>
  </div>
);
```

## Helpers - co-locate at the bottom of the file

```tsx
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string;
  accent: "ink" | "overdue" | "paid" | "sent";
}) {
  const accentClass = {
    ink:     "border-ink text-ink",
    overdue: "border-status-overdue text-status-overdue",
    paid:    "border-status-paid text-status-paid",
    sent:    "border-status-sent text-status-sent",
  }[accent];
  return (
    <div className={`p-5 bg-paper-2 border-t-2 ${accentClass}`}>
      <div className="cap text-ink-mute mb-2.5">{label}</div>
      <div className={`font-mono text-[28px] tracking-[-0.01em] ${accentClass.split(" ")[1]}`}>
        kr {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3 mt-1.5">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: "paid" | "sent" | "overdue" | "draft" }) {
  const map = {
    paid:    { label: "Betalt",  cls: "text-status-paid border-status-paid" },
    sent:    { label: "Sendt",   cls: "text-status-sent border-status-sent" },
    overdue: { label: "Forfalt", cls: "text-status-overdue border-status-overdue" },
    draft:   { label: "Utkast",  cls: "text-status-draft border-status-draft" },
  } as const;
  const { label, cls } = map[status];
  return <span className={`cap inline-block px-2.5 py-1 text-[10px] border ${cls}`}>{label}</span>;
}

function FilterTabs({ current, onChange }: {
  current: string; onChange: (v: any) => void;
}) {
  const tabs: Array<[string, string]> = [
    ["all", "Alle"], ["sent", "Sendt"], ["overdue", "Forfalt"], ["draft", "Utkast"],
  ];
  return (
    <div className="flex gap-3 text-[13px]">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={current === id
            ? "text-ink border-b border-ink"
            : "text-ink-mute hover:text-ink"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function monthName(d: Date) {
  return d.toLocaleString("nb-NO", { month: "long" });
}
```

## Sidebar (if you want the dark inset sidebar from the brand doc)

The brand mockup shows a 240px ink sidebar. The current repo uses a top navbar - keep the top navbar for v1, but optionally introduce a dashboard-only sidebar later by wrapping `app/(app)/layout.tsx`. **Skip for now** - out of scope for the brand port.

## Commit

```
dashboard: paper-feel restyle (ink top-borders, clay status pills, italic serif greeting, mono numerals)
```

Continue → [07-create-invoice.md](./07-create-invoice.md)
