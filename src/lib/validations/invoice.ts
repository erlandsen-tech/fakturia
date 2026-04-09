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
  notes: z.string().max(2000).optional(),
  vat_rate: z.number().min(0).max(100).optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  org_number: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  postal_code: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
