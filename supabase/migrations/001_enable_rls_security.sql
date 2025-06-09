-- Enable Row Level Security on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Clients table policies
CREATE POLICY "Users can view their own clients" ON public.clients
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own clients" ON public.clients
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own clients" ON public.clients
    FOR DELETE USING (auth.uid()::text = user_id);

-- Invoices table policies
CREATE POLICY "Users can view their own invoices" ON public.invoices
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own invoices" ON public.invoices
    FOR UPDATE USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own invoices" ON public.invoices
    FOR DELETE USING (auth.uid()::text = user_id);

-- Invoice items table policies (linked to invoices via invoice_id)
CREATE POLICY "Users can view invoice items for their invoices" ON public.invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert invoice items for their invoices" ON public.invoice_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update invoice items for their invoices" ON public.invoice_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete invoice items for their invoices" ON public.invoice_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

-- Payments table policies (linked to invoices via invoice_id)
CREATE POLICY "Users can view payments for their invoices" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = payments.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert payments for their invoices" ON public.payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = payments.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update payments for their invoices" ON public.payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = payments.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = payments.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete payments for their invoices" ON public.payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = payments.invoice_id 
            AND invoices.user_id = auth.uid()::text
        )
    );

-- Create indexes for performance on user_id columns
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- Add user_id trigger functions for automatic assignment
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid()::text;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set user_id on insert
CREATE TRIGGER set_user_id_trigger_clients
    BEFORE INSERT ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE TRIGGER set_user_id_trigger_invoices
    BEFORE INSERT ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- Additional security: Prevent user_id modification
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'user_id cannot be modified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to prevent user_id modification
CREATE TRIGGER prevent_user_id_change_clients
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_invoices
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change(); 