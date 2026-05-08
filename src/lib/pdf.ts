import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF, type InvoicePDFProps } from '@/components/InvoicePDF';

export type InvoicePDFData = InvoicePDFProps;

export async function renderInvoicePdf(data: InvoicePDFData): Promise<Buffer> {
  // InvoicePDF renders <Document> at the root; cast satisfies strict @react-pdf types
  const element = React.createElement(InvoicePDF, data) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(element);
}

/**
 * Adapter: maps a flat (company, client, invoice) payload — the shape used by
 * earlier callers — to the new nested `InvoicePDFProps`. Keeps the email/API
 * routes working without touching their data assembly.
 */
export interface LegacyInvoicePDFData {
  company: {
    name: string;
    address: string;
    orgNumber: string;
    email: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    slogan?: string;
    bankAccount?: string;
  };
  client: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  };
  invoice: {
    number: string;
    date: string;
    dueDate?: string;
    orderNumber?: string;
    items: Array<{
      number: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      amount: number;
      vat: number;
    }>;
    notes?: string;
    subtotal: number;
    vat: number;
    total: number;
    currency: string;
    paymentTerms: string;
  };
}

export function adaptLegacyInvoicePdfData(d: LegacyInvoicePDFData): InvoicePDFProps {
  return {
    invoice: {
      number: d.invoice.number,
      issue_date: d.invoice.date,
      due_date: d.invoice.dueDate ?? "",
      sender: {
        name: d.company.name,
        address: d.company.address,
        org_no: d.company.orgNumber,
        email: d.company.email,
        phone: d.company.phone,
      },
      recipient: {
        name: d.client.name,
        address: [d.client.address, [d.client.postalCode, d.client.city].filter(Boolean).join(" "), d.client.country]
          .filter(Boolean)
          .join("\n"),
      },
      references: d.invoice.orderNumber ? { theirs: d.invoice.orderNumber } : undefined,
      items: d.invoice.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unitPrice,
        vat_rate: it.vat,
      })),
      payment: {
        account: d.company.bankAccount ?? "",
      },
      note: d.invoice.notes,
    },
  };
}

export async function renderLegacyInvoicePdf(d: LegacyInvoicePDFData): Promise<Buffer> {
  return renderInvoicePdf(adaptLegacyInvoicePdfData(d));
}
