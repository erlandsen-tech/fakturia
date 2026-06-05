/**
 * Single source of truth for invoice money math.
 *
 * Money is NOK, handled in integer øre. The DB, the PDF, and the EHF XML must
 * all agree to the øre — previously each recomputed totals independently with
 * float arithmetic, which could disagree by an øre and break EN16931 rounding
 * rules (sum of line tax must equal the document tax). Every consumer now calls
 * computeInvoiceTotals() so rounding happens once, per line, in øre.
 *
 * VAT registration is enforced here too: a seller who is NOT registered in the
 * Merverdiavgiftsregisteret must never carry VAT. When sellerVatRegistered is
 * false, every line's effective rate is forced to 0.
 */

export interface MoneyLineInput {
  quantity: number;
  unit_price: number; // NOK
  vat_rate: number;   // percent, e.g. 25
}

export interface MoneyLineResult {
  /** Effective VAT rate after applying seller registration (0 if not registered). */
  effectiveRate: number;
  /** Line net amount (quantity × unit_price), rounded, in øre. */
  amountOre: number;
  /** Line VAT amount, rounded, in øre. */
  vatAmountOre: number;
}

export interface InvoiceTotals {
  lines: MoneyLineResult[];
  subtotalOre: number;
  vatOre: number;
  totalOre: number;
}

/** NOK → integer øre. */
export function toOre(nok: number): number {
  return Math.round(nok * 100);
}

/** Integer øre → NOK (number). */
export function fromOre(ore: number): number {
  return ore / 100;
}

/**
 * Compute all invoice totals once, in øre, rounding per line.
 *
 * @param items               line inputs (quantity, unit_price NOK, vat_rate %)
 * @param sellerVatRegistered when false, every line's VAT is forced to 0
 */
export function computeInvoiceTotals(
  items: MoneyLineInput[],
  sellerVatRegistered: boolean,
): InvoiceTotals {
  const lines: MoneyLineResult[] = items.map((it) => {
    const effectiveRate = sellerVatRegistered ? it.vat_rate : 0;
    // quantity is an integer count; round the unit price to øre first, then
    // multiply, so each line is exact to the øre.
    const amountOre = Math.round(toOre(it.unit_price) * it.quantity);
    const vatAmountOre = Math.round((amountOre * effectiveRate) / 100);
    return { effectiveRate, amountOre, vatAmountOre };
  });

  const subtotalOre = lines.reduce((s, l) => s + l.amountOre, 0);
  const vatOre = lines.reduce((s, l) => s + l.vatAmountOre, 0);

  return { lines, subtotalOre, vatOre, totalOre: subtotalOre + vatOre };
}

/** Format an øre amount as a Norwegian-locale 2-decimal string (no currency). */
export function formatOre(ore: number): string {
  return fromOre(ore).toLocaleString('nb-NO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
