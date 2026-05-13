# 11 — EHF / PEPPOL BIS Billing 3.0 export

Shipped 2026-05-13. Adds a second invoice export format alongside the PDF: a UBL 2.1 XML document conforming to **EHF 3.0** (the Norwegian profile of PEPPOL BIS Billing 3.0). Users can download it from the invoice page or have it auto-attached to the send-invoice email.

This is **step 1 of two**. Step 2 — delivering EHF over the PEPPOL network via an Access Point — is researched but not implemented; see "Follow-ups" at the bottom.

## Specs

- **EHF 3.0 (Anskaffelser.no):** <https://anskaffelser.no/verktoy/ehf-elektronisk-handelsformat/ehf-faktura-30>
- **PEPPOL BIS Billing 3.0 syntax:** <https://docs.peppol.eu/poacc/billing/3.0/syntax/ubl-invoice/>
- **Validator** (test output here before sending to real receivers): <https://www.itb.ec.europa.eu/invoice/upload>

Key invariants the generator enforces:

| UBL element | Value |
|---|---|
| `cbc:CustomizationID` | `urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0` |
| `cbc:ProfileID` | `urn:fdc:peppol.eu:2017:poacc:billing:01:1.0` |
| `cbc:InvoiceTypeCode` | `380` (commercial invoice) |
| `cbc:PaymentMeansCode` | `30` (credit transfer) |
| `cbc:DocumentCurrencyCode` | `NOK` (default; per-invoice override via `invoices.currency`) |
| `EndpointID` / `PartyLegalEntity/CompanyID` schemeID | `0192` (Norwegian Organisation Number) |
| `InvoicedQuantity[@unitCode]` | UN/ECE Rec 20, default `C62` (one/piece). `HUR` = hour, `DAY` = day, etc. |
| Tax category | `S` (standard) for any positive rate; `Z` (zero-rated) for 0%. Mixed rates are grouped into separate `TaxSubtotal`s. |

## Schema (migration `20260513120000_ehf_invoice_fields.sql`)

Additive only — no nullable→required changes, no renames.

```
clients         + org_number, address_line1, address_line2, postal_code,
                  city, country (default 'NO'), vat_number, peppol_endpoint
invoices        + currency (default 'NOK'), buyer_reference, payment_reference
invoice_items   + unit_code (default 'C62')
```

`clients.peppol_endpoint` is `"<scheme>:<id>"` (e.g. `0192:999888777`). For Norwegian receivers we default to `0192:` + `org_number` when unset.

## File map

| File | Role |
|---|---|
| `supabase/migrations/20260513120000_ehf_invoice_fields.sql` | Schema |
| `src/lib/ehf.ts` | Pure-string UBL 2.1 builder. `buildEhfInvoice({invoice, company, client})` → XML string; throws `EhfValidationError` with `.missing: string[]` if mandatory fields are absent. No XML lib dependency. |
| `src/app/api/invoices/[id]/ehf/route.ts` | `GET` → `Content-Type: application/xml`, `Content-Disposition: attachment; filename="EHF_<n>.xml"`. Returns `422 { missing }` when required fields are unset so the UI can guide the user. |
| `src/components/InvoiceDetailClient.tsx` | "Last ned EHF" button next to "Last ned PDF". |
| `src/lib/email.ts` | `sendInvoiceEmail` now accepts optional `ehfXml` and attaches it. |
| `src/app/api/invoices/[id]/route.ts` (PATCH send) | Best-effort EHF generation. If buyer/seller metadata is incomplete the XML is dropped silently — the PDF email still goes out. |
| `src/app/clients/new/page.tsx` + `clients/[id]/page.tsx` | "EHF / e-invoice" form section: orgnr, MVA, postal address, PEPPOL endpoint. |

## Required fields (validation)

`buildEhfInvoice()` throws `EhfValidationError` if any of these are missing:

- Company: `name`, `org_number`, `address_line1`, `postal_code`, `city`, `bank_account`
- Client: `name`, `org_number`, `address_line1`, `postal_code`, `city`
- Invoice: `invoice_number`, `issue_date`, `due_date`, at least one line

The download API surfaces this as `422 { error, missing: [...] }`; the button toasts `"Mangler felter for EHF: …"`.

## How to test

1. In Supabase, ensure `company_settings` for the test user has `organization_number`, `address_line1`, `postal_code`, `city`, `bank_account` filled.
2. Open a client, add `Organisasjonsnummer`, `Adresse`, `Postnr.`, `Poststed`.
3. Create an invoice for that client.
4. Open the invoice → click **Last ned EHF**.
5. Upload the downloaded XML to <https://www.itb.ec.europa.eu/invoice/upload>, pick "Peppol BIS Billing 3.0", and check the report.

## Follow-ups (intentionally out of scope)

- **UI for `buyer_reference` and `payment_reference` (KID).** Columns exist; no input field yet. The generator falls back to `client.company || client.name` for `BuyerReference`, which is acceptable for private receivers but public-sector buyers usually need a specific reference (e.g. ressursnummer).
- **Unit-code selector on line items.** Currently every line is `C62` (piece). Add a dropdown when the first user complains.
- **Schematron validation in CI.** Run the official EHF schematron against a fixture invoice on each PR. Reduces the risk of regression breaking compliance.
- **Step 2 — delivery via PEPPOL Access Point.** Today users download the XML and forward it themselves. To deliver it electronically over PEPPOL we need an AP provider. Research summary:
  - **B2Brouter (ES)** — best DX-to-price for a small SaaS. Public pricing (€110/yr Pro unlimited), self-serve sign-up, REST + OpenAPI docs, EHF/NO certified. Free 24/yr tier to prototype.
  - **SendRegning (Visma, NO)** — NOK 11/invoice + NOK 35/mo. Self-serve, NO-market trusted, REST API at `sendregning.github.io`. Higher per-invoice cost but transparent.
  - Skip Storecove (sales-only, ~€495/mo), Pagero/Tickstar, Logiq (enterprise sales). Skip Tripletex/Unimicro (accounting systems, not resellable APs).
  - Recommended integration: a `POST /api/invoices/[id]/send-via-peppol` endpoint that takes the existing EHF XML, POSTs it to the provider with our API key, and stores the provider's tracking ID on the invoice.

## Commit

```
feat(ehf): EHF 3.0 / PEPPOL BIS Billing 3.0 e-invoice export
```

(commit `cd221cf`, deployed 2026-05-13)
