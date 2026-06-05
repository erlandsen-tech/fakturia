/**
 * EHF 3.0 / PEPPOL BIS Billing 3.0 invoice (UBL 2.1) generator.
 *
 * Spec: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/
 * Norwegian profile (Anskaffelser.no): https://anskaffelser.no/verktoy/ehf-elektronisk-handelsformat/ehf-faktura-30
 *
 * The output is a self-contained string. We do NOT depend on an XML library;
 * everything is escaped through `xe()` before interpolation.
 */

import { computeInvoiceTotals } from './money';

const CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';
const PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';
const INVOICE_TYPE_COMMERCIAL = '380';
const PAYMENT_MEANS_CREDIT_TRANSFER = '30';
const PEPPOL_SCHEME_NO_ORG = '0192'; // Norwegian Organisation Number

// EN16931 category 'E' (exempt) requires a human-readable exemption reason
// (BT-120). Default text for a Norwegian seller below the MVA threshold.
const DEFAULT_TAX_EXEMPTION_REASON = 'Selger er ikke registrert i Merverdiavgiftsregisteret';

export interface EhfCompany {
  name: string;
  org_number?: string | null;
  vat_number?: string | null;       // e.g. "NO999888777MVA"
  // True only when registered in the Merverdiavgiftsregisteret. Drives whether
  // lines use category 'S' (with a seller VAT id) or 'E' (exempt, no VAT id).
  vat_registered?: boolean | null;
  tax_exemption_reason?: string | null; // BT-120 text used for category 'E'
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;          // ISO-2, default "NO"
  email?: string | null;
  phone?: string | null;
  bank_account?: string | null;     // BBAN or IBAN
  contact_name?: string | null;
}

export interface EhfClient {
  name: string;
  company?: string | null;
  org_number?: string | null;
  vat_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  peppol_endpoint?: string | null;  // "0192:999888777"
}

export interface EhfLine {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit_code?: string | null;        // UN/ECE Rec 20, default C62
}

export interface EhfInvoice {
  invoice_number: string;
  issue_date: string;               // YYYY-MM-DD
  due_date: string;                 // YYYY-MM-DD
  currency?: string;                // default NOK
  buyer_reference?: string | null;
  payment_reference?: string | null; // KID
  notes?: string | null;
  lines: EhfLine[];
}

export class EhfValidationError extends Error {
  constructor(public missing: string[]) {
    super(`EHF invoice is missing required fields: ${missing.join(', ')}`);
    this.name = 'EhfValidationError';
  }
}

/** XML-escape text content. Strips control characters that are illegal in XML 1.0. */
function xe(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format a number to a fixed 2-decimal string. */
function n2(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2);
}

/** Norwegian orgnr → PEPPOL participant ID, fallback to provided endpoint. */
function peppolEndpoint(endpoint: string | null | undefined, orgNumber: string | null | undefined): { scheme: string; id: string } | null {
  if (endpoint) {
    const m = endpoint.match(/^(\d{4}):(.+)$/);
    if (m) return { scheme: m[1], id: m[2] };
  }
  if (orgNumber) {
    return { scheme: PEPPOL_SCHEME_NO_ORG, id: orgNumber.replace(/\s+/g, '') };
  }
  return null;
}

/**
 * Returns the EN16931 tax category code for a line.
 *
 * A seller NOT registered for VAT must use 'E' (exempt) — BR-S-02 forbids
 * category 'S' unless the seller carries a VAT identifier, which a
 * non-registered seller does not have. A registered seller uses 'S' for
 * positive rates and 'Z' (zero-rated) for an explicit 0% line.
 */
function taxCategory(rate: number, sellerVatRegistered: boolean): 'S' | 'Z' | 'E' {
  if (!sellerVatRegistered) return 'E';
  if (rate > 0) return 'S';
  return 'Z';
}

function validate(invoice: EhfInvoice, company: EhfCompany, client: EhfClient): void {
  const missing: string[] = [];
  if (!company.name) missing.push('company.name');
  if (!company.org_number) missing.push('company.org_number');
  if (!company.address_line1) missing.push('company.address_line1');
  if (!company.city) missing.push('company.city');
  if (!company.postal_code) missing.push('company.postal_code');
  if (!company.bank_account) missing.push('company.bank_account');
  // A VAT-registered seller emitting category 'S' MUST carry a VAT id (BR-S-02).
  if (company.vat_registered && !company.vat_number) missing.push('company.vat_number');
  if (!client.name) missing.push('client.name');
  if (!client.org_number) missing.push('client.org_number');
  if (!client.address_line1) missing.push('client.address_line1');
  if (!client.city) missing.push('client.city');
  if (!client.postal_code) missing.push('client.postal_code');
  if (!invoice.invoice_number) missing.push('invoice.invoice_number');
  if (!invoice.issue_date) missing.push('invoice.issue_date');
  if (!invoice.due_date) missing.push('invoice.due_date');
  if (!invoice.lines || invoice.lines.length === 0) missing.push('invoice.lines');
  if (missing.length > 0) throw new EhfValidationError(missing);
}

function renderParty(opts: {
  endpoint: { scheme: string; id: string } | null;
  legalName: string;
  partyName?: string | null;
  orgNumber?: string | null;
  vatNumber?: string | null;
  address1?: string | null;
  address2?: string | null;
  postal?: string | null;
  city?: string | null;
  country?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const country = (opts.country || 'NO').toUpperCase();
  const parts: string[] = [];
  if (opts.endpoint) {
    parts.push(`<cbc:EndpointID schemeID="${xe(opts.endpoint.scheme)}">${xe(opts.endpoint.id)}</cbc:EndpointID>`);
    parts.push(`<cac:PartyIdentification><cbc:ID schemeID="${xe(opts.endpoint.scheme)}">${xe(opts.endpoint.id)}</cbc:ID></cac:PartyIdentification>`);
  }
  parts.push(`<cac:PartyName><cbc:Name>${xe(opts.partyName || opts.legalName)}</cbc:Name></cac:PartyName>`);

  const addrLines: string[] = [];
  if (opts.address1) addrLines.push(`<cbc:StreetName>${xe(opts.address1)}</cbc:StreetName>`);
  if (opts.address2) addrLines.push(`<cbc:AdditionalStreetName>${xe(opts.address2)}</cbc:AdditionalStreetName>`);
  if (opts.city) addrLines.push(`<cbc:CityName>${xe(opts.city)}</cbc:CityName>`);
  if (opts.postal) addrLines.push(`<cbc:PostalZone>${xe(opts.postal)}</cbc:PostalZone>`);
  addrLines.push(`<cac:Country><cbc:IdentificationCode>${xe(country)}</cbc:IdentificationCode></cac:Country>`);
  parts.push(`<cac:PostalAddress>${addrLines.join('')}</cac:PostalAddress>`);

  if (opts.vatNumber) {
    parts.push(`<cac:PartyTaxScheme><cbc:CompanyID>${xe(opts.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`);
  }

  const legal: string[] = [`<cbc:RegistrationName>${xe(opts.legalName)}</cbc:RegistrationName>`];
  if (opts.orgNumber) legal.push(`<cbc:CompanyID schemeID="${PEPPOL_SCHEME_NO_ORG}">${xe(opts.orgNumber)}</cbc:CompanyID>`);
  parts.push(`<cac:PartyLegalEntity>${legal.join('')}</cac:PartyLegalEntity>`);

  if (opts.contactName || opts.phone || opts.email) {
    const contact: string[] = [];
    if (opts.contactName) contact.push(`<cbc:Name>${xe(opts.contactName)}</cbc:Name>`);
    if (opts.phone) contact.push(`<cbc:Telephone>${xe(opts.phone)}</cbc:Telephone>`);
    if (opts.email) contact.push(`<cbc:ElectronicMail>${xe(opts.email)}</cbc:ElectronicMail>`);
    parts.push(`<cac:Contact>${contact.join('')}</cac:Contact>`);
  }

  return `<cac:Party>${parts.join('')}</cac:Party>`;
}

/**
 * Build an EHF 3.0 Invoice XML string.
 * Throws EhfValidationError if mandatory fields are missing.
 */
export function buildEhfInvoice(input: {
  invoice: EhfInvoice;
  company: EhfCompany;
  client: EhfClient;
}): string {
  const { invoice, company, client } = input;
  validate(invoice, company, client);

  const currency = (invoice.currency || 'NOK').toUpperCase();
  const sellerVatRegistered = !!company.vat_registered;
  const exemptionReason = company.tax_exemption_reason || DEFAULT_TAX_EXEMPTION_REASON;

  // Single rounding pass in integer øre, shared with the DB and PDF so all three
  // agree exactly (sum of line tax === document tax, satisfying EN16931 rounding).
  const totals = computeInvoiceTotals(
    invoice.lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate })),
    sellerVatRegistered,
  );
  const oreStr = (ore: number) => (ore / 100).toFixed(2);

  type Computed = EhfLine & {
    line_no: number;
    cat: 'S' | 'Z' | 'E';
    effectiveRate: number;
    amountOre: number;
    taxOre: number;
  };
  const computed: Computed[] = invoice.lines.map((l, i) => ({
    ...l,
    line_no: i + 1,
    cat: taxCategory(l.vat_rate, sellerVatRegistered),
    effectiveRate: totals.lines[i].effectiveRate,
    amountOre: totals.lines[i].amountOre,
    taxOre: totals.lines[i].vatAmountOre,
  }));

  const lineTotalOre = totals.subtotalOre;
  const taxTotalOre = totals.vatOre;
  const payableOre = totals.totalOre;

  // Group by (category, effective rate) for cac:TaxSubtotal.
  const groups = new Map<string, { rate: number; cat: 'S' | 'Z' | 'E'; taxableOre: number; taxOre: number }>();
  for (const l of computed) {
    const key = `${l.cat}:${l.effectiveRate}`;
    const g = groups.get(key) ?? { rate: l.effectiveRate, cat: l.cat, taxableOre: 0, taxOre: 0 };
    g.taxableOre += l.amountOre;
    g.taxOre += l.taxOre;
    groups.set(key, g);
  }

  const sellerEndpoint = peppolEndpoint(null, company.org_number);
  const buyerEndpoint = peppolEndpoint(client.peppol_endpoint, client.org_number);

  const supplier = renderParty({
    endpoint: sellerEndpoint,
    legalName: company.name,
    partyName: company.name,
    orgNumber: company.org_number,
    // Only a genuinely VAT-registered seller emits a VAT id. A non-registered
    // seller must NOT (category 'E' + no PartyTaxScheme avoids BR-S-02).
    vatNumber: sellerVatRegistered ? company.vat_number : null,
    address1: company.address_line1,
    address2: company.address_line2,
    postal: company.postal_code,
    city: company.city,
    country: company.country,
    contactName: company.contact_name || company.name,
    phone: company.phone,
    email: company.email,
  });

  const customer = renderParty({
    endpoint: buyerEndpoint,
    legalName: client.company || client.name,
    partyName: client.company || client.name,
    orgNumber: client.org_number,
    vatNumber: client.vat_number,
    address1: client.address_line1,
    address2: client.address_line2,
    postal: client.postal_code,
    city: client.city,
    country: client.country,
    contactName: client.name,
    phone: client.phone,
    email: client.email,
  });

  const subtotalXml = Array.from(groups.values()).map((g) => {
    // EN16931 element order inside cac:TaxCategory: ID, Percent,
    // TaxExemptionReason, TaxScheme. Reason is required for category 'E'.
    const exemptionXml = g.cat === 'E'
      ? `\n        <cbc:TaxExemptionReason>${xe(exemptionReason)}</cbc:TaxExemptionReason>`
      : '';
    return `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${oreStr(g.taxableOre)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${oreStr(g.taxOre)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${g.cat}</cbc:ID>
        <cbc:Percent>${n2(g.rate)}</cbc:Percent>${exemptionXml}
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }).join('');

  const linesXml = computed.map((l) => `
  <cac:InvoiceLine>
    <cbc:ID>${l.line_no}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${xe(l.unit_code || 'C62')}">${n2(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${oreStr(l.amountOre)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xe(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${l.cat}</cbc:ID>
        <cbc:Percent>${n2(l.effectiveRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${n2(l.unit_price)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="${xe(l.unit_code || 'C62')}">1</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>`).join('');

  const noteXml = invoice.notes ? `\n  <cbc:Note>${xe(invoice.notes)}</cbc:Note>` : '';
  const buyerRefXml = invoice.buyer_reference
    ? `\n  <cbc:BuyerReference>${xe(invoice.buyer_reference)}</cbc:BuyerReference>`
    : `\n  <cbc:BuyerReference>${xe(client.company || client.name)}</cbc:BuyerReference>`;
  const paymentIdXml = invoice.payment_reference
    ? `\n    <cbc:PaymentID>${xe(invoice.payment_reference)}</cbc:PaymentID>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${CUSTOMIZATION_ID}</cbc:CustomizationID>
  <cbc:ProfileID>${PROFILE_ID}</cbc:ProfileID>
  <cbc:ID>${xe(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${xe(invoice.issue_date)}</cbc:IssueDate>
  <cbc:DueDate>${xe(invoice.due_date)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${INVOICE_TYPE_COMMERCIAL}</cbc:InvoiceTypeCode>${noteXml}
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>${buyerRefXml}
  <cac:AccountingSupplierParty>${supplier}</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${customer}</cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${PAYMENT_MEANS_CREDIT_TRANSFER}</cbc:PaymentMeansCode>${paymentIdXml}
    <cac:PayeeFinancialAccount>
      <cbc:ID>${xe((company.bank_account || '').replace(/\s+/g, ''))}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${oreStr(taxTotalOre)}</cbc:TaxAmount>${subtotalXml}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${oreStr(lineTotalOre)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${oreStr(lineTotalOre)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${oreStr(payableOre)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${oreStr(payableOre)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</Invoice>
`;
}
