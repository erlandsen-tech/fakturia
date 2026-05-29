# 07 - Create invoice form

The current `src/app/invoices/create/page.tsx` (21KB) has solid form logic - keep it. This chapter is **visual + UX rebrand**: the form sits on a white "paper" card with the brand wordmark in the top-left corner, and there's a new AI-assist sidebar on the right.

## Layout: replace the outer wrapper + add the AI sidebar

Wrap the existing form in this two-column layout:

```tsx
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";

return (
  <div className="bg-paper-grain min-h-screen px-6 lg:px-12 py-8">
    <div className="max-w-7xl mx-auto">
      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 text-ink-3">
          <Link href="/invoices" className="hover:text-ink">← Fakturaer</Link>
          <span>·</span>
          <span className="font-display text-[22px] text-ink">Ny faktura</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={saveDraft}>Lagre som utkast</Button>
          <Button variant="clay" type="submit" form="invoice-form">Send faktura →</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* PAPER CARD with the form */}
        <form
          id="invoice-form"
          onSubmit={handleSubmit}
          className="bg-white px-10 lg:px-14 py-12 shadow-paper border border-ink/8"
        >
          <div className="flex justify-between mb-9">
            <div>
              <Wordmark size={0.9} />
              <div className="text-xs text-ink-3 mt-2">
                {senderProfile.name} · {senderProfile.address} · {senderProfile.org_no}
              </div>
            </div>
            <div className="text-right">
              <div className="cap text-ink-mute">Faktura</div>
              <div className="font-mono text-[20px] mt-0.5">{nextNumber}</div>
            </div>
          </div>
          <hr className="hairline" />

          {/* the existing client / dates / line-items / totals JSX goes here,
              restyled with brand utilities (font-display for emphasis,
              font-mono for amounts, cap for column headers) */}
          {/* ... */}
        </form>

        {/* AI ASSIST SIDEBAR */}
        <aside className="flex flex-col gap-5">
          <AIAssistCard onApply={applyAISuggestion} />
          <ChecksCard items={preflight} />
          <p className="px-4 text-xs text-ink-3 leading-[1.6] border-t border-ink/10 pt-4">
            Når du trykker <strong>Send</strong> får mottakeren en e-post med en lenke. De kan betale med Vipps eller kort. Du får varsel når de åpner og når de betaler.
          </p>
        </aside>
      </div>
    </div>
  </div>
);
```

## New component: `src/components/invoices/AIAssistCard.tsx`

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AIAssistCard({ onApply }: { onApply: (patch: any) => void }) {
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [trace, setTrace] = useState<string[]>([]);

  async function run() {
    setThinking(true);
    setTrace([]);
    const res = await fetch("/api/ai/draft-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    setTrace(json.trace ?? []);
    if (json.patch) onApply(json.patch);
    setThinking(false);
  }

  return (
    <div className="bg-ink text-paper p-6">
      <div className="cap text-sun mb-3">AI-assistent</div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='"Lag faktura til Berge for designarbeid i mai, 12 timer."'
        className="w-full bg-transparent border-b border-paper/20 text-paper placeholder:text-ink-mute font-display italic text-[20px] leading-[1.2] resize-none outline-none focus:border-clay py-2"
        rows={3}
      />
      <p className="text-xs text-ink-mute mt-3 leading-[1.6]">
        Skriv det med ord - vi finner kunden, satser, og mva-prosent. Du redigerer, godkjenner, sender.
      </p>
      <Button
        variant="clay"
        size="sm"
        onClick={run}
        disabled={!prompt || thinking}
        className="mt-4 w-full"
      >
        {thinking ? "Tenker…" : "Foreslå"}
      </Button>
      {trace.length > 0 && (
        <div className="mt-4 p-3 bg-paper/5 font-mono text-[11px] text-paper-2/70 leading-[1.7]">
          {trace.map((line, i) => <div key={i}>▸ {line}</div>)}
        </div>
      )}
    </div>
  );
}
```

## New component: `src/components/invoices/ChecksCard.tsx`

```tsx
import { Check, Circle } from "lucide-react";

export interface PreflightCheck { ok: boolean; label: string; }

export function ChecksCard({ items }: { items: PreflightCheck[] }) {
  return (
    <div className="bg-paper-2 p-5">
      <div className="cap text-ink-mute mb-2.5">Sjekk før send</div>
      {items.map((c, i) => (
        <div key={i} className="flex gap-2.5 py-2 text-[13px]">
          {c.ok
            ? <Check className="w-3.5 h-3.5 text-status-paid mt-0.5 shrink-0" />
            : <Circle className="w-3.5 h-3.5 text-clay mt-0.5 shrink-0" />}
          <span className={c.ok ? "text-ink-2" : "text-ink"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
```

## Class swaps within the existing form JSX

| Old class | New class |
|---|---|
| `font-bold` on totals | `font-mono` on amounts, `font-display` on the Total label |
| `text-slate-500/600` | `text-ink-3` |
| `text-slate-900` | `text-ink` |
| `text-emerald-500` | `text-clay` |
| Column header `text-xs uppercase tracking-wide` | `cap text-ink-mute` |
| Row borders `border-slate-200` | `border-ink/8` |
| Currency display | wrap value in `<span className="font-mono">` |

## Commit

```
create-invoice: paper-card form layout, AI assist sidebar, preflight checks panel
```

Continue → [08-pdf-email.md](./08-pdf-email.md)
