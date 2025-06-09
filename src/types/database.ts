export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  invoice_points: number;
  updated_at: string;
  created_at: string;
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