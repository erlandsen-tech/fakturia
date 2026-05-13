-- ============================================================================
-- EHF / PEPPOL BIS Billing 3.0 support
-- Adds the fields required to emit a valid UBL 2.1 Invoice document for
-- the Norwegian EHF 3.0 profile (PEPPOL BIS Billing 3.0).
-- ============================================================================

-- Clients: buyer party (cac:AccountingCustomerParty)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS org_number       text,
  ADD COLUMN IF NOT EXISTS address_line1    text,
  ADD COLUMN IF NOT EXISTS address_line2    text,
  ADD COLUMN IF NOT EXISTS postal_code      text,
  ADD COLUMN IF NOT EXISTS city             text,
  ADD COLUMN IF NOT EXISTS country          text DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS vat_number       text,
  -- PEPPOL participant identifier, e.g. "0192:123456789" for a Norwegian orgnr.
  -- Optional today; required if we ever auto-deliver via an Access Point.
  ADD COLUMN IF NOT EXISTS peppol_endpoint  text;

-- Invoices: currency + buyer/payment references
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS currency           text NOT NULL DEFAULT 'NOK',
  -- Required by many public-sector EHF receivers (cbc:BuyerReference).
  ADD COLUMN IF NOT EXISTS buyer_reference    text,
  -- KID / structured payment reference (cbc:PaymentID).
  ADD COLUMN IF NOT EXISTS payment_reference  text;

-- Invoice items: UN/ECE Rec 20 unit code for cbc:InvoicedQuantity[@unitCode]
-- C62 = "one / piece", HUR = hour, DAY = day, KGM = kg, MTR = metre, etc.
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS unit_code text NOT NULL DEFAULT 'C62';
