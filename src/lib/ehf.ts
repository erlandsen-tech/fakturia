/**
 * EHF 3.0 / PEPPOL BIS Billing 3.0 invoice (UBL 2.1) generator.
 *
 * Spec: https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/
 * Norwegian profile (Anskaffelser.no): https://anskaffelser.no/verktoy/ehf-elektronisk-handelsformat/ehf-faktura-30
 *
 * The output is a self-contained string. We do NOT depend on an XML library;
 * everything is escaped through `xe()` before interpolation.
 */

const CUSTOMIZATION_ID = 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';
const PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';
const INVOICE_TYPE_COMMERCIAL = '380';
const PAYMENT_MEANS_CREDIT_TRANSFER = '30';
const PEPPOL_SCHEME_NO_ORG = '0192'; // Norwegian Organisation Number

export interface EhfCompany {
  name: string;
  org_number?: string | null;
  vat_number?: string | null;       // e.g. "NO999888777MVA"
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

/** Returns the EN16931 tax category code for a given rate. */
function taxCategory(rate: number): 'S' | 'Z' | 'E' {
  if (rate > 0) return 'S';
  return 'Z'; // zero-rated; "E" (exempt) requires a tax exemption reason
}

function validate(invoice: EhfInvoice, company: EhfCompany, client: EhfClient): void {
  const missing: string[] = [];
  if (!company.name) missing.push('company.name');
  if (!company.org_number) missing.push('company.org_number');
  if (!company.address_line1) missing.push('company.address_line1');
  if (!company.city) missing.push('company.city');
  if (!company.postal_code) missing.push('company.postal_code');
  if (!company.bank_account) missing.push('company.bank_account');
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

  // Per-line totals.
  type Computed = EhfLine & { line_amount: number; tax_amount: number; line_no: number };
  const computed: Computed[] = invoice.lines.map((l, i) => {
    const line_amount = l.quantity * l.unit_price;
    return {
      ...l,
      line_amount,
      tax_amount: line_amount * (l.vat_rate / 100),
      line_no: i + 1,
    };
  });

  const lineTotal = computed.reduce((s, l) => s + l.line_amount, 0);
  const taxTotal = computed.reduce((s, l) => s + l.tax_amount, 0);
  const payable = lineTotal + taxTotal;

  // Group by (rate, category) for cac:TaxSubtotal.
  const groups = new Map<string, { rate: number; cat: string; taxable: number; tax: number }>();
  for (const l of computed) {
    const cat = taxCategory(l.vat_rate);
    const key = `${cat}:${l.vat_rate}`;
    const g = groups.get(key) ?? { rate: l.vat_rate, cat, taxable: 0, tax: 0 };
    g.taxable += l.line_amount;
    g.tax += l.tax_amount;
    groups.set(key, g);
  }

  const sellerEndpoint = peppolEndpoint(null, company.org_number);
  const buyerEndpoint = peppolEndpoint(client.peppol_endpoint, client.org_number);

  const supplier = renderParty({
    endpoint: sellerEndpoint,
    legalName: company.name,
    partyName: company.name,
    orgNumber: company.org_number,
    vatNumber: company.vat_number,
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

  const subtotalXml = Array.from(groups.values()).map((g) => `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${n2(g.taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${n2(g.tax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${g.cat}</cbc:ID>
        <cbc:Percent>${n2(g.rate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join('');

  const linesXml = computed.map((l) => `
  <cac:InvoiceLine>
    <cbc:ID>${l.line_no}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${xe(l.unit_code || 'C62')}">${n2(l.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${n2(l.line_amount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xe(l.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${taxCategory(l.vat_rate)}</cbc:ID>
        <cbc:Percent>${n2(l.vat_rate)}</cbc:Percent>
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
    <cbc:TaxAmount currencyID="${currency}">${n2(taxTotal)}</cbc:TaxAmount>${subtotalXml}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${n2(lineTotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${n2(lineTotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${n2(payable)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${n2(payable)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${linesXml}
</Invoice>
`;
}
