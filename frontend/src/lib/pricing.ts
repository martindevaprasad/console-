// Client-side mirror of the server pricing engine, used only for instant
// cart previews. The server recomputes every total authoritatively.

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PreviewLine { unitPrice: number; quantity: number; taxRate: number }

export function previewTotals(
  lines: PreviewLine[],
  opts: { taxInclusive: boolean; discount?: { type: string; value: number } | null; serviceChargePct?: number },
) {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  let discount = 0;
  if (opts.discount && subtotal > 0) {
    discount = opts.discount.type === 'PERCENT' ? subtotal * (opts.discount.value / 100) : opts.discount.value;
    discount = round2(Math.min(Math.max(discount, 0), subtotal));
  }
  let tax = 0;
  for (const l of lines) {
    const gross = l.unitPrice * l.quantity;
    const net = gross - (subtotal ? (discount * gross) / subtotal : 0);
    tax += opts.taxInclusive ? net - net / (1 + l.taxRate / 100) : net * (l.taxRate / 100);
  }
  tax = round2(tax);
  const net = subtotal - discount;
  const service = round2(net * ((opts.serviceChargePct || 0) / 100));
  const total = round2((opts.taxInclusive ? net : net + tax) + service);
  return { subtotal, discount, tax, service, total };
}

export function roundCash(amount: number, increment: number) {
  if (!increment) return round2(amount);
  return round2(Math.round(amount / increment) * increment);
}
