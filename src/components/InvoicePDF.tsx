import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font
} from '@react-pdf/renderer';

// Placeholder logo URL
const LOGO_URL = 'https://via.placeholder.com/180x60?text=LOGO';

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 32,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 8,
  },
  companySlogan: {
    color: '#009688',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addressBlock: {
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 1.3,
  },
  invoiceInfo: {
    alignItems: 'flex-end',
    fontSize: 11,
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #eee',
    alignItems: 'center',
    minHeight: 24,
  },
  tableHeader: {
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    padding: 4,
    fontSize: 11,
    flexGrow: 1,
    flexBasis: 0,
    borderRight: '1px solid #eee',
  },
  tableCellLast: {
    borderRight: 0,
  },
  notes: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 8,
    color: '#444',
  },
  totalsBlock: {
    alignItems: 'flex-end',
    marginTop: 12,
    marginBottom: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    fontSize: 12,
    marginBottom: 2,
  },
  totalsLabel: {
    minWidth: 120,
    textAlign: 'right',
    marginRight: 8,
  },
  totalsValue: {
    minWidth: 80,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  paymentTerms: {
    fontSize: 11,
    marginTop: 12,
    color: '#222',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
});

// Helper for Norwegian date format
function formatDateNo(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Types for props
interface InvoicePDFProps {
  company: {
    name: string;
    address: string;
    orgNumber: string;
    email: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    slogan?: string;
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

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ company, client, invoice }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Image src={company.logoUrl || LOGO_URL} style={styles.logo} />
          {company.slogan && <Text style={styles.companySlogan}>{company.slogan}</Text>}
        </View>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>Faktura</Text>
          <Text>Fakturanummer: {invoice.number}</Text>
          <Text>Dato: {formatDateNo(invoice.date)}</Text>
          {invoice.orderNumber && <Text>Webordrenr.: {invoice.orderNumber}</Text>}
        </View>
      </View>

      {/* Address blocks */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={styles.addressBlock}>
          <Text>Leveringsadresse:</Text>
          <Text>{client.name}</Text>
          <Text>{client.address}</Text>
          <Text>{client.postalCode} {client.city}</Text>
          <Text>{client.country}</Text>
        </View>
        <View style={styles.addressBlock}>
          <Text>{company.name}</Text>
          <Text>{company.address}</Text>
          <Text>Org.nr: {company.orgNumber}</Text>
          <Text>{company.email}</Text>
          {company.phone && <Text>{company.phone}</Text>}
          {company.website && <Text>{company.website}</Text>}
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.tableCell}>Nummer</Text>
          <Text style={styles.tableCell}>Beskrivelse</Text>
          <Text style={styles.tableCell}>Antall</Text>
          <Text style={styles.tableCell}>Enhet</Text>
          <Text style={styles.tableCell}>Enhetspris</Text>
          <Text style={styles.tableCell}>Beløp</Text>
          <Text style={[styles.tableCell, styles.tableCellLast]}>Moms</Text>
        </View>
        {invoice.items.map((item, idx) => (
          <View style={styles.tableRow} key={idx}>
            <Text style={styles.tableCell}>{item.number}</Text>
            <Text style={styles.tableCell}>{item.description}</Text>
            <Text style={styles.tableCell}>{item.quantity}</Text>
            <Text style={styles.tableCell}>{item.unit}</Text>
            <Text style={styles.tableCell}>{item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.tableCell}>{item.amount.toFixed(2)}</Text>
            <Text style={[styles.tableCell, styles.tableCellLast]}>{item.vat}%</Text>
          </View>
        ))}
      </View>

      {/* Notes */}
      {invoice.notes && <Text style={styles.notes}>{invoice.notes}</Text>}

      {/* Totals */}
      <View style={styles.totalsBlock}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>I alt {invoice.currency} ekskl. mva</Text>
          <Text style={styles.totalsValue}>{invoice.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Mva</Text>
          <Text style={styles.totalsValue}>{invoice.vat.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { fontWeight: 'bold' }]}>I alt {invoice.currency} inkl. mva</Text>
          <Text style={[styles.totalsValue, { fontWeight: 'bold' }]}>{invoice.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment terms */}
      <Text style={styles.paymentTerms}><Text style={{ fontWeight: 'bold' }}>Betalingsbetingelser:</Text> {invoice.paymentTerms}</Text>

      {/* Footer */}
      <Text style={styles.footer}>
        {company.name}  -  {company.address}  -  Org.nr: {company.orgNumber}  -  {company.email}  {company.website ? `-  ${company.website}` : ''}
      </Text>
    </Page>
  </Document>
); 