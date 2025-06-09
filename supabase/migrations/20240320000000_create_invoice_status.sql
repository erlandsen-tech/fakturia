-- Create the invoice_status type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM (
            'draft',
            'sent',
            'paid',
            'overdue',
            'cancelled'
        );
    END IF;
END $$;

-- Add a comment to the type if it doesn't have one
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_description 
        WHERE objoid = 'invoice_status'::regtype
    ) THEN
        COMMENT ON TYPE public.invoice_status IS 'Status of an invoice in the system';
    END IF;
END $$;

-- Update the invoices table to use the new type
ALTER TABLE public.invoices 
  ALTER COLUMN status TYPE public.invoice_status 
  USING status::public.invoice_status; 