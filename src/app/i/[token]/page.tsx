import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Wordmark } from "@/components/brand/Wordmark";
import { Mark } from "@/components/brand/Mark";
import { InkwellTide } from "@/components/brand/illustrations";
import { fmtKr, fmtDate } from "@/lib/format";

interface PageProps {
  params: { token: string };
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit?: string | null;
}

interface PublicInvoice {
  id: string;
  number: string;
  issue_date: string;
  due_date: string;
  note: string | null;
  sender_name: string;
  sender_address: string;
  sender_org_no: string | null;
  sender_email: string | null;
  recipient_name: string;
  recipient_company: string | null;
  recipient_address: string | null;
  recipient_email: string | null;
  bank_account: string | null;
  kid: string | null;
  iban: string | null;
  items: InvoiceItem[];
}

interface RpcPayload {
  invoice: {
    id: string;
    invoice_number: string | null;
    issue_date: string;
    due_date: string;
    notes: string | null;
    bank_account: string | null;
    kid: string | null;
    iban: string | null;
  };
  client: { name?: string; email?: string; company?: string } | null;
  items: InvoiceItem[];
  company: {
    company_name?: string;
    address_line1?: string;
    address_line2?: string | null;
    city?: string;
    postal_code?: string;
    country?: string;
    organization_number?: string | null;
    email?: string | null;
    bank_account?: string | null;
  } | null;
}

async function getInvoiceByToken(token: string): Promise<PublicInvoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_public_invoice_by_token", { p_token: token })
    .single<RpcPayload>();
  if (error || !data) return null;

  const { invoice, client, items, company } = data;

  const senderAddress = company
    ? [
        company.address_line1,
        company.address_line2,
        [company.postal_code, company.city].filter(Boolean).join(" "),
        company.country,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return {
    id: invoice.id,
    number: invoice.invoice_number ?? invoice.id.slice(0, 8),
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    note: invoice.notes ?? null,
    sender_name: company?.company_name ?? "",
    sender_address: senderAddress,
    sender_org_no: company?.organization_number ?? null,
    sender_email: company?.email ?? null,
    recipient_name: client?.name ?? "",
    recipient_company: client?.company ?? null,
    recipient_address: null,
    recipient_email: client?.email ?? null,
    bank_account: invoice.bank_account ?? company?.bank_account ?? null,
    kid: invoice.kid ?? null,
    iban: invoice.iban ?? null,
    items: (items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      vat_rate: Number(it.vat_rate ?? 25),
      unit: it.unit ?? "stk",
    })),
  };
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const inv = await getInvoiceByToken(params.token);
  if (!inv) notFound();

  const subtotal = inv.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vat = inv.items.reduce(
    (s, i) => s + i.quantity * i.unit_price * (i.vat_rate / 100),
    0,
  );
  const total = subtotal + vat;

  return (
    <div className="bg-paper-grain text-ink min-h-screen">
      {/* TOP BAR */}
      <header className="flex justify-between items-center px-6 md:px-10 py-5 border-b border-ink/10">
        <div className="flex items-center gap-3">
          <Mark size={32} />
          <Wordmark size={0.8} />
        </div>
        <div className="cap text-ink-mute">Betal med bankoverføring</div>
      </header>

      {/* HERO */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] bg-paper-2 border-b border-ink/10">
        <div className="hidden lg:flex justify-center items-center p-12 border-r border-ink/10">
          <InkwellTide size={340} />
        </div>
        <div className="px-8 md:px-14 py-12 md:py-14">
          <div className="cap text-ink-mute mb-3">Faktura · No. {inv.number}</div>
          <h1 className="font-display text-[36px] md:text-[56px] leading-[1.05] tracking-[-0.02em] m-0">
            <em>{inv.sender_name || "Avsenderen"}</em> har sendt deg en faktura.
          </h1>
          <p className="text-[15px] text-ink-2 mt-4 leading-[1.6] max-w-[480px]">
            Betalingsdetaljene finner du til høyre. Bruk KID-nummeret når du betaler, så blir fakturaen registrert automatisk.
          </p>
          <div className="flex flex-wrap gap-9 mt-8 mb-8">
            <div>
              <div className="cap text-ink-mute mb-1.5">Beløp</div>
              <div className="font-mono text-[38px] tracking-[-0.01em]">{fmtKr(total)}</div>
            </div>
            <div>
              <div className="cap text-ink-mute mb-1.5">Forfaller</div>
              <div className="font-display text-[32px]">{fmtDate(inv.due_date, "long")}</div>
              <div className="text-xs text-ink-3 mt-0.5">{daysFromNow(inv.due_date)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAIL BODY */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 px-6 md:px-10 py-14 max-w-6xl mx-auto">
        <div>
          {/* PARTIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <div className="cap text-ink-mute mb-2">Fra</div>
              <div className="font-display text-[22px]">{inv.sender_name}</div>
              <div className="text-[13px] text-ink-2 leading-[1.6] mt-1.5 whitespace-pre-line">
                {inv.sender_address}
                {inv.sender_org_no ? `\nOrg.nr ${inv.sender_org_no}` : ""}
                {inv.sender_email ? `\n${inv.sender_email}` : ""}
              </div>
            </div>
            <div>
              <div className="cap text-ink-mute mb-2">Til</div>
              <div className="font-display text-[22px]">{inv.recipient_name}</div>
              <div className="text-[13px] text-ink-2 leading-[1.6] mt-1.5 whitespace-pre-line">
                {inv.recipient_company ? `${inv.recipient_company}\n` : ""}
                {inv.recipient_address ?? ""}
                {inv.recipient_email ? `\n${inv.recipient_email}` : ""}
              </div>
            </div>
          </div>

          {/* LINES */}
          <div className="cap text-ink-mute mb-3.5">Linjer</div>
          <div className="border-t border-ink">
            <div className="grid grid-cols-[1fr_60px_100px_120px] py-2.5 cap text-ink-mute border-b border-ink/12">
              <div>Beskrivelse</div>
              <div className="text-right">Antall</div>
              <div className="text-right">Á pris</div>
              <div className="text-right">Sum</div>
            </div>
            {inv.items.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_60px_100px_120px] py-4 border-b border-ink/8 items-baseline"
              >
                <div className="text-[15px]">{it.description}</div>
                <div className="font-mono text-right text-sm text-ink-2">
                  {it.quantity} {it.unit}
                </div>
                <div className="font-mono text-right text-sm text-ink-2">
                  {fmtKr(it.unit_price, false)}
                </div>
                <div className="font-mono text-right text-[15px]">
                  {fmtKr(it.quantity * it.unit_price, false)}
                </div>
              </div>
            ))}
          </div>

          {/* TOTALS */}
          <div className="flex justify-end mt-6">
            <div className="min-w-[320px]">
              <Row label="Sum eks. mva" value={fmtKr(subtotal, false)} />
              <Row label="MVA 25%" value={fmtKr(vat, false)} />
              <div className="flex justify-between pt-4 border-t border-ink mt-1.5">
                <div className="font-display text-[22px]">Å betale</div>
                <div className="font-mono text-[22px]">{fmtKr(total)}</div>
              </div>
            </div>
          </div>

          {inv.note && (
            <div className="mt-10 p-5 bg-paper-2 border-l-2 border-clay">
              <div className="cap text-ink-mute mb-1.5">Notat</div>
              <div className="font-display italic text-[18px] text-ink-2 leading-[1.4]">
                &ldquo;{inv.note}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* SIDE RAIL */}
        <aside className="flex flex-col gap-6">
          <div className="bg-ink text-paper p-6">
            <div className="cap text-ink-mute mb-3.5">Bankoverføring</div>
            <Detail k="Konto" v={inv.bank_account ?? "-"} mono inverted />
            <Detail k="KID" v={inv.kid ?? "-"} mono inverted />
            <Detail k="Forfall" v={fmtDate(inv.due_date)} inverted />
            <Detail k="Beløp" v={fmtKr(total)} mono inverted />
            <p className="mt-4 pt-4 border-t border-paper/15 text-[11px] text-ink-mute leading-[1.5]">
              Husk å oppgi KID. Penger merket &ldquo;Faktura {inv.number}&rdquo; går også fram.
            </p>
          </div>
        </aside>
      </section>

      <footer className="flex justify-between items-center px-6 md:px-10 py-6 border-t border-ink/10 bg-paper-2">
        <div className="flex items-center gap-2.5 text-xs text-ink-3">
          <Mark size={20} /> Sendt med Fakturio · Trygt og bokført
        </div>
        <div className="font-mono text-[11px] text-ink-mute">
          fakturio.no/i/{params.token}
        </div>
      </footer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-ink-3">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Detail({
  k,
  v,
  mono,
  inverted,
}: {
  k: string;
  v: string;
  mono?: boolean;
  inverted?: boolean;
}) {
  return (
    <div
      className={[
        "flex justify-between py-2 border-b",
        inverted ? "border-paper/10" : "border-ink/8",
      ].join(" ")}
    >
      <span className={["text-xs", inverted ? "text-ink-mute" : "text-ink-3"].join(" ")}>{k}</span>
      <span className={[mono ? "font-mono" : "", "text-[13px]"].join(" ")}>{v}</span>
    </div>
  );
}

function daysFromNow(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)} dager siden forfall`;
  if (d === 0) return "i dag";
  return `om ${d} dager`;
}
