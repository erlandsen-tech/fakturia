import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface SendInvoiceEmailInput {
  to: string;
  invoiceNumber: string;
  companyName: string;
  totalLabel: string;
  pdfBuffer: Buffer;
  ehfXml?: string | null;
}

export async function sendInvoiceEmail(input: SendInvoiceEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL || 'faktura@fakturio.no';
  const subject = `Faktura ${input.invoiceNumber} fra ${input.companyName}`;

  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">Ny faktura fra ${escapeHtml(input.companyName)}</h2>
      <p>Hei,</p>
      <p>Vedlagt finner du faktura <strong>${escapeHtml(input.invoiceNumber)}</strong> på <strong>${escapeHtml(input.totalLabel)}</strong>.</p>
      <p>Ta kontakt om du har spørsmål.</p>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
        Sendt via Fakturio
      </p>
    </div>
  `;

  const attachments: Array<{ filename: string; content: Buffer | string }> = [
    {
      filename: `${input.invoiceNumber}.pdf`,
      content: input.pdfBuffer,
    },
  ];
  if (input.ehfXml) {
    attachments.push({
      filename: `EHF_${input.invoiceNumber}.xml`,
      content: input.ehfXml,
    });
  }

  // The Resend SDK RESOLVES to { data, error } — it does NOT reject on
  // API/validation errors (unverified domain, bad recipient, 4xx/5xx). It only
  // rejects on network faults. So we must inspect `error` and throw, otherwise
  // a failed send looks successful to callers and a paid point is consumed for
  // an email that never went out.
  const { data, error } = await getResend().emails.send({
    from,
    to: input.to,
    subject,
    html,
    attachments,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }

  return data;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;'
    : c === '<' ? '&lt;'
    : c === '>' ? '&gt;'
    : c === '"' ? '&quot;'
    : '&#39;'
  );
}
