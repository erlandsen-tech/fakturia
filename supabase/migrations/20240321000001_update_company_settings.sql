-- Add new fields to company_settings table
ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS organization_number TEXT,
ADD COLUMN IF NOT EXISTS is_company_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- Add comment to explain the new fields
COMMENT ON COLUMN public.company_settings.organization_number IS 'Organization number (org.nr.) for the company';
COMMENT ON COLUMN public.company_settings.is_company_registered IS 'Whether the company is registered in Foretaksregisteret';
COMMENT ON COLUMN public.company_settings.vat_registered IS 'Whether the company is registered for VAT';
COMMENT ON COLUMN public.company_settings.vat_number IS 'VAT registration number'; 