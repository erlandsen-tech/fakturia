import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/InvoicePDF';

export interface InvoicePDFData {
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

export async function renderInvoicePdf(data: InvoicePDFData): Promise<Buffer> {
  // InvoicePDF renders <Document> at the root; cast satisfies strict @react-pdf types
  const element = React.createElement(InvoicePDF, data) as any;
  return renderToBuffer(element);
}
