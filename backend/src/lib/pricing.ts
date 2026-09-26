// Server-authoritative pricing & tax engine.
// Supports tax-inclusive (VAT/GST style) and tax-exclusive (US sales tax) pricing,
// per-item tax rates, prorated order discounts, service charge and tips.

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PriceLine {
  unitPrice: number; // base + modifiers
  quantity: number;
  taxRate: number; // percent
  taxName?: string;
  voided?: boolean;
}

export interface PriceInput {
  lines: PriceLine[];
  taxInclusive: boolean;
  discount?: { type: 'PERCENT' | 'FIXED'; value: number; maxDiscount?: number | null } | null;
  serviceChargePct?: number;
  tip?: number;
}

export interface PriceResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  tipAmount: number;
  total: number;
  lines: { gross: number; discount: number; tax: number }[];
  taxBreakdown: { name: string; rate: number; taxable: number; amount: number }[];
}

export function calculate(input: PriceInput): PriceResult {
  const active = input.lines.map((l) => (l.voided ? 0 : l.unitPrice * l.quantity));
  const subtotal = round2(active.reduce((s, g) => s + g, 0));

  let discountAmount = 0;
  if (input.discount && subtotal > 0) {
    discountAmount = input.discount.type === 'PERCENT'
      ? subtotal * (input.discount.value / 100)
      : input.discount.value;
    if (input.discount.maxDiscount) discountAmount = Math.min(discountAmount, input.discount.maxDiscount);
    discountAmount = round2(Math.min(Math.max(discountAmount, 0), subtotal));
  }

  const breakdown = new Map<string, { name: string; rate: number; taxable: number; amount: number }>();
  let taxAmount = 0;
  const lines = input.lines.map((l, i) => {
    const gross = active[i];
    const disc = subtotal > 0 ? (discountAmount * gross) / subtotal : 0;
    const net = gross - disc;
    const tax = input.taxInclusive ? net - net / (1 + l.taxRate / 100) : net * (l.taxRate / 100);
    taxAmount += tax;
    if (l.taxRate > 0 && gross > 0) {
      const key = `${l.taxName || 'Tax'}@${l.taxRate}`;
      const b = breakdown.get(key) || { name: l.taxName || 'Tax', rate: l.taxRate, taxable: 0, amount: 0 };
      b.taxable += input.taxInclusive ? net - tax : net;
      b.amount += tax;
      breakdown.set(key, b);
    }
    return { gross: round2(gross), discount: round2(disc), tax: round2(tax) };
  });
  taxAmount = round2(taxAmount);

  const net = subtotal - discountAmount;
  const serviceCharge = round2(net * ((input.serviceChargePct || 0) / 100));
  const tipAmount = round2(input.tip || 0);
  const total = round2((input.taxInclusive ? net : net + taxAmount) + serviceCharge + tipAmount);

  return {
    subtotal, discountAmount, taxAmount, serviceCharge, tipAmount, total, lines,
    taxBreakdown: [...breakdown.values()].map((b) => ({ ...b, taxable: round2(b.taxable), amount: round2(b.amount) })),
  };
}

/** Cash rounding (e.g. 0.05 in CA/AU, 1 in IN). Returns the rounded amount due. */
export function roundCash(amount: number, increment: number): number {
  if (!increment) return round2(amount);
  return round2(Math.round(amount / increment) * increment);
}
