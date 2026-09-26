import React from 'react';
import { money, dateTime } from '@/lib/format';
import { ORDER_TYPE_LABELS, PAYMENT_LABELS } from '@/lib/constants';

/** Printable customer receipt / guest check. Rendered into `.print-area` and printed with window.print(). */
export const Receipt: React.FC<{ order: any; org: any; location: any; title?: string }> = ({ order, org, location, title }) => {
  const settings = org?.settings;
  const items = (order.items || []).filter((i: any) => i.status !== 'VOIDED');
  return (
    <div className="receipt">
      <div className="receipt-center">
        <div className="receipt-brand">{org?.name}</div>
        {org?.legalName && <div>{org.legalName}</div>}
        {location?.address && <div>{location.address}</div>}
        {org?.taxId && <div>Tax ID: {org.taxId}</div>}
        {(location?.receiptHeader || settings?.receipt?.header) && <div>{location?.receiptHeader || settings.receipt.header}</div>}
      </div>
      <div className="receipt-rule" />
      <div className="receipt-row"><span>{title || (order.paymentStatus === 'PAID' ? 'RECEIPT' : 'GUEST CHECK')}</span><span>#{order.ticketNumber ?? '—'}</span></div>
      <div className="receipt-row"><span>{ORDER_TYPE_LABELS[order.orderType]}{order.table ? ` · ${order.table.name}` : ''}</span><span>{dateTime(order.createdAt)}</span></div>
      {order.user && <div>Server: {order.user.name}</div>}
      {order.customer && <div>Guest: {order.customer.name}</div>}
      <div className="receipt-rule" />
      {items.map((i: any) => (
        <div key={i.id}>
          <div className="receipt-row"><span>{i.quantity} × {i.name}</span><span>{money(i.subtotal)}</span></div>
          {(i.modifiers || []).map((m: any) => <div key={m.id} className="receipt-mod">+ {m.name}</div>)}
        </div>
      ))}
      <div className="receipt-rule" />
      <div className="receipt-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
      {order.discountAmount > 0 && <div className="receipt-row"><span>Discount</span><span>-{money(order.discountAmount)}</span></div>}
      {order.serviceCharge > 0 && <div className="receipt-row"><span>Service charge</span><span>{money(order.serviceCharge)}</span></div>}
      {settings?.receipt?.showTaxBreakdown && (order.taxBreakdown || []).map((t: any) => (
        <div key={`${t.name}${t.rate}`} className="receipt-row"><span>{t.name} {t.rate}%{org?.taxInclusive ? ' (incl.)' : ''}</span><span>{money(t.amount)}</span></div>
      ))}
      {order.tipAmount > 0 && <div className="receipt-row"><span>Tip</span><span>{money(order.tipAmount)}</span></div>}
      {order.roundingAmount !== 0 && order.roundingAmount && <div className="receipt-row"><span>Rounding</span><span>{money(order.roundingAmount)}</span></div>}
      <div className="receipt-row receipt-total"><span>TOTAL</span><span>{money(order.total)}</span></div>
      {(order.payments || []).map((p: any) => (
        <div key={p.id} className="receipt-row"><span>{p.type === 'REFUND' ? 'Refund' : PAYMENT_LABELS[p.method]}{p.change ? ` (change ${money(p.change)})` : ''}</span><span>{p.type === 'REFUND' ? '-' : ''}{money(p.amount + (p.tip || 0))}</span></div>
      ))}
      {order.balanceDue > 0 && <div className="receipt-row receipt-total"><span>BALANCE DUE</span><span>{money(order.balanceDue)}</span></div>}
      <div className="receipt-rule" />
      <div className="receipt-center">{location?.receiptFooter || settings?.receipt?.footer}</div>
      <div className="receipt-center receipt-small">{order.orderNumber}</div>
    </div>
  );
};

export function printReceipt() {
  window.print();
}

export default Receipt;
