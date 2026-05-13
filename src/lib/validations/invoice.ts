import { z } from 'zod';

export const createInvoiceSchema = z.object({
  client_name: z.string().min(1, 'Client name is required').max(200),
  client_email: z.string().email('Invalid email').optional(),
  client_org_number: z.string().max(20).optional(),
  client_address: z.string().max(500).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive().max(10000),
    unit_price: z.number().nonnegative().max(10000000), // NOK øre
    vat_rate: z.number().min(0).max(100).default(25),
  })).min(1).max(50),
  issue_date: z.string().datetime().optional(),
  due_days: z.number().int().min(1).max(365).default(30),
  notes: z.string().max(2000).optional(),
  send: z.boolean().default(false),
});

export const updateInvoiceSchema = z.object({
  issue_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().max(2000).nullable().optional(),
  delivery_time: z.string().nullable().optional(),
  delivery_place: z.string().max(500).nullable().optional(),
  vat_rate: z.number().min(0).max(100).optional(),
});

// Web-app invoice creation: client_id (existing client) + line items
export const webCreateInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  issue_date: z.string(),
  due_date: z.string(),
  notes: z.string().max(2000).nullable().optional(),
  delivery_time: z.string().nullable().optional(),
  delivery_place: z.string().max(500).nullable().optional(),
  vat_rate: z.number().min(0).max(100).default(25),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().positive().max(10000),
    unit_price: z.number().nonnegative().max(10000000),
    vat_rate: z.number().min(0).max(100).default(25),
  })).min(1).max(50),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  // EHF / PEPPOL buyer party fields
  org_number: z.string().max(20).optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  postal_code: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  vat_number: z.string().max(30).optional(),
  peppol_endpoint: z.string().max(60).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
