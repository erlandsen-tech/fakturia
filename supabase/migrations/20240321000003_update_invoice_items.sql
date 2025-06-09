-- Add VAT-related fields to invoice_items table
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.invoice_items.vat_rate IS 'VAT rate percentage for this item';
COMMENT ON COLUMN public.invoice_items.vat_amount IS 'VAT amount for this item';

-- Update existing items to calculate VAT amounts
UPDATE public.invoice_items
SET vat_amount = amount * (vat_rate / 100)
WHERE vat_amount = 0; 