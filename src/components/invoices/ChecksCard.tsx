import { Check, Circle } from "lucide-react";

export interface PreflightCheck {
  ok: boolean;
  label: string;
}

export function ChecksCard({ items }: { items: PreflightCheck[] }) {
  return (
    <div className="bg-paper-2 p-5">
      <div className="cap text-ink-mute mb-2.5">Sjekk før send</div>
      {items.map((c, i) => (
        <div key={i} className="flex gap-2.5 py-2 text-[13px]">
          {c.ok ? (
            <Check className="w-3.5 h-3.5 text-status-paid mt-0.5 shrink-0" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-clay mt-0.5 shrink-0" />
          )}
          <span className={c.ok ? "text-ink-2" : "text-ink"}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
