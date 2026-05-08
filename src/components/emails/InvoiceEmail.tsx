export interface InvoiceEmailProps {
  recipientName: string;
  senderName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  daysUntilDue: number;
  summary: string;
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
