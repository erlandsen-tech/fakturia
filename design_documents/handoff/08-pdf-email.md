# 08 — PDF & email templates

Two transactional surfaces: the **PDF** the recipient downloads (`@react-pdf/renderer` already in deps), and the **email** notification with a big "Open & pay" button.

## File: `src/components/InvoicePDF.tsx` (REPLACE)

react-pdf doesn't read CSS variables, so brand tokens are duplicated as JS constants. The structure mirrors the brand mockup's PDF artboard.

```tsx
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";

// Self-host the brand fonts for react-pdf — point these at /public after running:
//   curl -L "https://fonts.gstatic.com/s/instrumentserif/v17/..." -o public/fonts/...
// (use Google Fonts Helper to grab the .woff2 URLs)
Font.register({
  family: "Instrument Serif",
  src: "https://fonts.gstatic.com/s/instrumentserif/v17/jizDREVItHgc8qDIbSTKq4XIRPesnu5Q5g.ttf",
  fontStyle: "normal",
});
Font.register({
  family: "Instrument Serif",
  src: "https://fonts.gstatic.com/s/instrumentserif/v17/jizGREVItHgc8qDIbSTKq4XIRPesnu5Q3oH8sw.ttf",
  fontStyle: "italic",
});
Font.register({
  family: "Inter Tight",
  fonts: [
    { src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2JCaQ.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxJEL2VmU3NS7Z2JCaQ.ttf", fontWeight: 500 },
  ],
});
Font.register({
  family: "JetBrains Mono",
  src: "https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjOVS-pNyldA.ttf",
});

const C = {
  paper:    "#FAF6ED",
  paper2:   "#EADFC9",
  paperBg:  "#D6CDB7",
  ink:      "#1A1815",
  ink2:     "#3B362E",
  ink3:     "#6B645A",
  inkMute:  "#9A9286",
  clay:     "#DC4F2C",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.paperBg,
    padding: 40,
    fontFamily: "Inter Tight",
    color: C.ink,
    fontSize: 11,
  },
  paper: {
    backgroundColor: C.paper,
    padding: 50,
    minHeight: "100%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 40 },
  wordmark: { fontFamily: "Instrument Serif", fontSize: 32, color: C.ink },
  wordmarkF: { fontFamily: "Instrument Serif", fontSize: 32, fontStyle: "italic" },
  wordmarkDot: { color: C.clay },
  senderMeta: { color: C.ink3, fontSize: 9, lineHeight: 1.6, marginTop: 10 },
  invoiceTitle: { fontFamily: "Instrument Serif", fontSize: 36, color: C.ink, textAlign: "right" },
  invoiceNo: { fontFamily: "JetBrains Mono", fontSize: 11, color: C.ink2, textAlign: "right", marginTop: 4 },

  addressRow: { flexDirection: "row", marginBottom: 30 },
  addressCol: { flex: 1 },
  cap: { fontSize: 8, letterSpacing: 1.4, color: C.inkMute, textTransform: "uppercase", marginBottom: 5 },
  serif: { fontFamily: "Instrument Serif", fontSize: 16, color: C.ink },
  small: { fontSize: 10, color: C.ink2, lineHeight: 1.6, marginTop: 4 },

  tableHead: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: C.ink,
    borderBottomWidth: 1, borderBottomColor: "rgba(26,24,21,0.12)", paddingVertical: 6,
  },
  th: { fontSize: 8, color: C.inkMute, textTransform: "uppercase", letterSpacing: 1.2 },
  row: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(26,24,21,0.06)",
    paddingVertical: 8, alignItems: "center",
  },
  cellNum:  { width: 30, fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 9 },
  cellDesc: { flex: 1, fontSize: 11 },
  cellQty:  { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 10 },
  cellUnit: { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 10 },
  cellPrice:{ width: 80, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 10 },
  cellVat:  { width: 50, textAlign: "right", fontFamily: "JetBrains Mono", color: C.ink3, fontSize: 10 },
  cellSum:  { width: 90, textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 11 },

  totalsBox: { marginTop: 20, alignSelf: "flex-end", minWidth: 280 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, fontSize: 11 },
  totalsLabel: { color: C.ink3 },
  totalsFinal: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 12, marginTop: 6, borderTopWidth: 2, borderTopColor: C.ink,
  },
  totalsFinalLabel: { fontFamily: "Instrument Serif", fontSize: 18 },
  totalsFinalValue: { fontFamily: "JetBrains Mono", fontSize: 18 },

  paymentBox: { marginTop: 30, padding: 20, backgroundColor: C.paper2, flexDirection: "row" },
  paymentCol: { flex: 1 },
  paymentValue: { fontFamily: "JetBrains Mono", fontSize: 13, marginTop: 4 },

  noteBlock: {
    marginTop: 24, fontFamily: "Instrument Serif", fontStyle: "italic",
    fontSize: 12, color: C.ink2, lineHeight: 1.5,
  },

  footer: {
    position: "absolute", bottom: 30, left: 50, right: 50,
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(26,24,21,0.1)",
    fontSize: 8, color: C.inkMute,
  },
});

export interface InvoicePDFProps {
  invoice: {
    number: string;
    issue_date: string;
    due_date: string;
    sender: { name: string; address: string; org_no: string; email: string; phone?: string };
    recipient: { name: string; company?: string; address: string; org_no?: string };
    references?: { ours?: string; theirs?: string };
    items: Array<{ description: string; quantity: number; unit: string; unit_price: number; vat_rate: number }>;
    payment: { account: string; kid?: string; iban?: string };
    note?: string;
  };
}

const fmt = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InvoicePDF({ invoice: i }: InvoicePDFProps) {
  const subtotal = i.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const vat = i.items.reduce((s, it) => s + it.quantity * it.unit_price * (it.vat_rate / 100), 0);
  const total = subtotal + vat;

  return (
    <Document title={`Faktura ${i.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.paper}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <View style={{ flexDirection: "row" }}>
                <Text style={styles.wordmarkF}>F</Text>
                <Text style={styles.wordmark}>akturio</Text>
                <Text style={[styles.wordmark, styles.wordmarkDot]}>.</Text>
              </View>
              <Text style={styles.senderMeta}>
                {i.sender.name}{"\n"}{i.sender.address}{"\n"}
                Org.nr {i.sender.org_no} MVA{"\n"}{i.sender.email}
                {i.sender.phone ? ` · ${i.sender.phone}` : ""}
              </Text>
            </View>
            <View style={{ marginTop: 30 }}>
              <Text style={styles.invoiceTitle}>Faktura</Text>
              <Text style={styles.invoiceNo}>No. {i.number}</Text>
            </View>
          </View>

          {/* ADDRESS ROW */}
          <View style={styles.addressRow}>
            <View style={styles.addressCol}>
              <Text style={styles.cap}>Faktureres til</Text>
              <Text style={styles.serif}>{i.recipient.company ?? i.recipient.name}</Text>
              <Text style={styles.small}>
                {i.recipient.company && `v/ ${i.recipient.name}\n`}
                {i.recipient.address}
                {i.recipient.org_no ? `\nOrg.nr ${i.recipient.org_no}` : ""}
              </Text>
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.cap}>Detaljer</Text>
              <DetailRow label="Faktura-dato" value={i.issue_date} />
              <DetailRow label="Forfallsdato" value={i.due_date} />
              {i.references?.ours && <DetailRow label="Vår referanse" value={i.references.ours} />}
              {i.references?.theirs && <DetailRow label="Deres referanse" value={i.references.theirs} />}
            </View>
          </View>

          {/* ITEMS */}
          <View style={styles.tableHead}>
            <Text style={[styles.cellNum, styles.th]}>#</Text>
            <Text style={[styles.cellDesc, styles.th]}>Beskrivelse</Text>
            <Text style={[styles.cellQty, styles.th]}>Antall</Text>
            <Text style={[styles.cellUnit, styles.th]}>Enhet</Text>
            <Text style={[styles.cellPrice, styles.th]}>Á pris</Text>
            <Text style={[styles.cellVat, styles.th]}>Mva</Text>
            <Text style={[styles.cellSum, styles.th]}>Sum</Text>
          </View>
          {i.items.map((it, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.cellNum}>{String(idx + 1).padStart(2, "0")}</Text>
              <Text style={styles.cellDesc}>{it.description}</Text>
              <Text style={styles.cellQty}>{it.quantity}</Text>
              <Text style={styles.cellUnit}>{it.unit}</Text>
              <Text style={styles.cellPrice}>{fmt(it.unit_price)}</Text>
              <Text style={styles.cellVat}>{it.vat_rate}%</Text>
              <Text style={styles.cellSum}>{fmt(it.quantity * it.unit_price)}</Text>
            </View>
          ))}

          {/* TOTALS */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sum eks. mva</Text>
              <Text style={{ fontFamily: "JetBrains Mono" }}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>MVA 25%</Text>
              <Text style={{ fontFamily: "JetBrains Mono" }}>{fmt(vat)}</Text>
            </View>
            <View style={styles.totalsFinal}>
              <Text style={styles.totalsFinalLabel}>Å betale NOK</Text>
              <Text style={styles.totalsFinalValue}>{fmt(total)}</Text>
            </View>
          </View>

          {/* PAYMENT */}
          <View style={styles.paymentBox}>
            <View style={styles.paymentCol}>
              <Text style={styles.cap}>Konto</Text>
              <Text style={styles.paymentValue}>{i.payment.account}</Text>
            </View>
            {i.payment.kid && (
              <View style={styles.paymentCol}>
                <Text style={styles.cap}>KID</Text>
                <Text style={styles.paymentValue}>{i.payment.kid}</Text>
              </View>
            )}
            {i.payment.iban && (
              <View style={styles.paymentCol}>
                <Text style={styles.cap}>IBAN</Text>
                <Text style={styles.paymentValue}>{i.payment.iban}</Text>
              </View>
            )}
          </View>

          {i.note && <Text style={styles.noteBlock}>"{i.note}"</Text>}

          <View style={styles.footer}>
            <Text>Side 1 av 1</Text>
            <Text>Sendt med Fakturio · fakturio.no</Text>
            <Text>Faktura no. {i.number}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ color: C.ink3, fontSize: 10 }}>{label}</Text>
      <Text style={{ fontFamily: "JetBrains Mono", fontSize: 10 }}>{value}</Text>
    </View>
  );
}
```

> The font URLs above are Google Fonts CDN — fine for server-side react-pdf in Next.js. If you want fully self-hosted, drop the .ttf files in `public/fonts/` and update the `src` paths.

## Email template — `src/components/emails/InvoiceEmail.tsx` (NEW)

Plain HTML email (no react-email needed). Use this with whatever transactional provider you're plugged into (Resend / Postmark / Supabase Edge functions).

```tsx
export interface InvoiceEmailProps {
  recipientName: string;
  senderName: string;
  invoiceNumber: string;
  amount: string;       // pre-formatted "kr 31 875,00"
  dueDate: string;      // pre-formatted "14. mai 2026"
  daysUntilDue: number;
  summary: string;      // "Identitetsdesign + 2 til"
  payUrl: string;
  pdfUrl: string;
  webUrl: string;
  note?: string;
}

export function renderInvoiceEmail(p: InvoiceEmailProps): string {
  return `
<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Faktura ${p.invoiceNumber}</title>
</head>
<body style="margin:0;background:#E0D2B6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1A1815;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E0D2B6;padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;box-shadow:0 30px 60px -20px rgba(26,24,21,0.3);">
      <tr><td style="padding:40px 32px;background:#F4ECDC;text-align:center;">
        <div style="margin-bottom:24px;font-size:0;">
          <!-- 40px square mark, inline SVG -->
          <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="56" height="56" rx="2" fill="#1A1815"/>
            <text x="14" y="48" font-family="Georgia,serif" font-style="italic" font-size="42" fill="#F4ECDC">F</text>
            <circle cx="50" cy="48" r="3.5" fill="#DC4F2C"/>
          </svg>
        </div>
        <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#9A9286;margin-bottom:12px;">Faktura · No. ${p.invoiceNumber}</div>
        <h1 style="font-family:Georgia,serif;font-size:36px;line-height:1.1;margin:0 0 28px;letter-spacing:-0.02em;font-weight:400;">
          ${esc(p.senderName)} har sendt deg<br/>en <em>faktura</em>.
        </h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid rgba(26,24,21,0.08);margin-bottom:24px;">
          <tr><td style="padding:24px;">
            <table role="presentation" width="100%"><tr>
              <td style="color:#6B645A;font-size:13px;">Beløp</td>
              <td align="right" style="font-family:'Courier New',monospace;font-size:22px;">${esc(p.amount)}</td>
            </tr></table>
            <table role="presentation" width="100%" style="margin-top:14px;"><tr>
              <td style="color:#6B645A;font-size:13px;">Forfaller</td>
              <td align="right" style="font-size:14px;">${esc(p.dueDate)} <span style="color:#9A9286;">· om ${p.daysUntilDue} dager</span></td>
            </tr></table>
            <table role="presentation" width="100%" style="margin-top:14px;"><tr>
              <td style="color:#6B645A;font-size:13px;">For</td>
              <td align="right" style="font-size:14px;">${esc(p.summary)}</td>
            </tr></table>
          </td></tr>
        </table>
        <a href="${p.payUrl}" style="display:block;width:100%;padding:18px 0;background:#DC4F2C;color:#fff;text-decoration:none;font-size:15px;font-weight:500;text-align:center;">Åpne og betal →</a>
        <div style="text-align:center;margin-top:14px;font-size:12px;color:#6B645A;">
          Eller <a href="${p.pdfUrl}" style="color:#1A1815;">last ned PDF</a> · <a href="${p.webUrl}" style="color:#1A1815;">se i nettleser</a>
        </div>
        ${p.note ? `<div style="margin-top:32px;padding:16px;background:#EADFC9;border-left:3px solid #DC4F2C;font-family:Georgia,serif;font-size:16px;font-style:italic;color:#3B362E;line-height:1.45;text-align:left;">"${esc(p.note)}"</div>` : ""}
      </td></tr>
      <tr><td style="padding:20px 32px;font-size:11px;color:#9A9286;text-align:center;line-height:1.6;">
        Sendt med Fakturio · Du betaler ingenting til oss.<br/>
        Du kan svare på denne e-posten direkte til ${esc(p.senderName)}.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```

> Email clients are inconsistent with Google Fonts via @import in `<style>`, so the email uses Georgia as a system fallback for the display serif. The wordmark is inlined SVG for crisp rendering on retina inboxes that support it.

## Commit

```
templates: restyle InvoicePDF to brand A4, add HTML invoice email with inline-SVG mark
```

Continue → [09-i18n-navbar.md](./09-i18n-navbar.md)
