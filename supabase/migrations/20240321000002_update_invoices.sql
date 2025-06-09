-- Add new fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_place TEXT,
ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(10,2) DEFAULT 0.00;

-- Add comment to explain the new fields
COMMENT ON COLUMN public.invoices.delivery_time IS 'Time of delivery for the goods/services';
COMMENT ON COLUMN public.invoices.delivery_place IS 'Place of delivery for the goods/services';
COMMENT ON COLUMN public.invoices.vat_rate IS 'VAT rate percentage';
COMMENT ON COLUMN public.invoices.vat_amount IS 'Total VAT amount';
COMMENT ON COLUMN public.invoices.subtotal_amount IS 'Total amount before VAT';

-- Create a function to ensure sequential invoice numbers
CREATE OR REPLACE FUNCTION public.ensure_sequential_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    last_invoice RECORD;
BEGIN
    -- Get the last invoice number
    SELECT * INTO last_invoice
    FROM public.invoices
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;

    -- If this is the first invoice, start with 1
    IF last_invoice IS NULL THEN
        NEW.invoice_number := 'INV-0001';
    ELSE
        -- Extract the number part and increment
        NEW.invoice_number := 'INV-' || LPAD((CAST(SUBSTRING(last_invoice.invoice_number FROM 5) AS INTEGER) + 1)::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure sequential invoice numbers
DROP TRIGGER IF EXISTS ensure_sequential_invoice_number ON public.invoices;
CREATE TRIGGER ensure_sequential_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_sequential_invoice_number(); 