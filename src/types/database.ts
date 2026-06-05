export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  user_id: string;
  // EHF / PEPPOL fields
  org_number?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;       // ISO 3166-1 alpha-2, default "NO"
  vat_number?: string | null;
  peppol_endpoint?: string | null; // e.g. "0192:123456789"
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  invoice_points: number;
  updated_at: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  unit_price: number;
  vat_rate: number;
  unit: string;
  unit_code: string;
  product_number?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  user_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal_amount: number;
  vat_amount: number;
  total_amount: number;
  vat_rate: number;
  delivery_time: string | null;
  delivery_place: string | null;
  notes?: string;
  currency?: string;            // ISO 4217, default "NOK"
  buyer_reference?: string | null;
  payment_reference?: string | null; // KID
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  unit_code?: string;           // UN/ECE Rec 20, default "C62" (piece)
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithDetails extends Invoice {
  client: Client;
  items: InvoiceItem[];
  payments: Payment[];
} 