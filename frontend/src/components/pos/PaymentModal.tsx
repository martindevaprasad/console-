import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  IconCash, IconCreditCard, IconDeviceMobile, IconGift, IconStar, IconBuildingBank, IconDots, IconCheck, IconPrinter, IconReceipt,
} from '@tabler/icons-react';
import Modal from '../shared/Modal';
import { useMutate, useOrg } from '@/hooks';
import { ORDERS } from '@/services/api';
import { money } from '@/lib/format';
import { roundCash, round2 } from '@/lib/pricing';
import { PAYMENT_LABELS } from '@/lib/constants';
import { Field } from '../shared/ui';

const METHODS = [
  { value: 'CASH', icon: <IconCash size={18} /> },
  { value: 'CARD', icon: <IconCreditCard size={18} /> },
  { value: 'DIGITAL', icon: <IconDeviceMobile size={18} /> },
  { value: 'GIFT_CARD', icon: <IconGift size={18} /> },
  { value: 'LOYALTY', icon: <IconStar size={18} /> },
  { value: 'HOUSE_ACCOUNT', icon: <IconBuildingBank size={18} /> },
  { value: 'OTHER', icon: <IconDots size={18} /> },
];

interface Props {
  order: any | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (order: any) => void;
  onFinished: (order: any) => void;
  onPrint: () => void;
}

export const PaymentModal: React.FC<Props> = ({ order, open, onClose, onUpdated, onFinished, onPrint }) => {
  const { settings } = useOrg();
  const mutate = useMutate();
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [tendered, setTendered] = useState('');
  const [tip, setTip] = useState(0);
  const [reference, setReference] = useState('');
  const [splitWays, setSplitWays] = useState(1);
  const [busy, setBusy] = useState(false);
  const [lastChange, setLastChange] = useState<number | null>(null);

  const balance = order ? round2(order.balanceDue) : 0;
  const rounding = settings?.pos.cashRounding || 0;
  const cashDue = method === 'CASH' && rounding ? roundCash(balance, rounding) : balance;
  const paid = order?.paymentStatus === 'PAID';

  useEffect(() => {
    if (!open) return;
    setAmount(''); setTendered(''); setTip(0); setReference(''); setSplitWays(1); setLastChange(null); setMethod('CASH');
  }, [open]);

  const methods = METHODS.filter((m) => {
    if (m.value === 'LOYALTY') return !!settings?.modules.loyalty && !!order?.customer;
    if (m.value === 'HOUSE_ACCOUNT') return !!order?.customer?.houseAccount;
    return true;
  });

  const applyAmount = amount !== '' ? parseFloat(amount) || 0 : round2(splitWays > 1 ? balance / splitWays : (method === 'CASH' ? cashDue : balance));
  const tenderedNum = tendered !== '' ? parseFloat(tendered) || 0 : applyAmount;
  const change = method === 'CASH' ? Math.max(0, round2(tenderedNum - applyAmount)) : 0;
  const tipBase = order ? order.subtotal - order.discountAmount : 0;

  const quickCash = useMemo(() => {
    const d = method === 'CASH' ? applyAmount : 0;
    const set = new Set<number>([d]);
    [5, 10, 20, 50, 100].forEach((n) => set.add(Math.ceil(d / n) * n));
    return [...set].filter((v) => v >= d).sort((a, b) => a - b).slice(0, 4);
  }, [applyAmount, method]);

  const pay = async () => {
    if (!order || applyAmount <= 0) return;
    if (method === 'CASH' && tenderedNum < applyAmount) { toast.error('Tendered cash is less than the amount'); return; }
    setBusy(true);
    try {
      const res = await mutate(ORDERS.ADD_PAYMENT, {
        orderId: order.id,
        payment: { method, amount: applyAmount, tip: tip || 0, tendered: method === 'CASH' ? tenderedNum : null, reference: reference || null },
      });
      const updated = res.addPayment;
      onUpdated(updated);
      setAmount(''); setTendered(''); setTip(0); setReference('');
      if (splitWays > 1) setSplitWays(Math.max(1, splitWays - 1));
      const last = updated.payments[updated.payments.length - 1];
      setLastChange(last?.change ?? null);
      if (updated.paymentStatus === 'PAID') toast.success('Payment complete');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!order) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title={paid ? 'Payment complete' : `Settle ticket #${order.ticketNumber ?? ''}`} size="lg"
      footer={paid ? <>
        <button className="btn btn-secondary" onClick={onPrint}><IconPrinter size={14} /> Print receipt</button>
        <button className="btn btn-primary" onClick={() => onFinished(order)}><IconReceipt size={14} /> New order</button>
      </> : <>
        <button className="btn btn-secondary" onClick={onPrint}><IconPrinter size={14} /> Print check</button>
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Close</button>
        <button className="btn btn-primary" onClick={pay} disabled={busy || applyAmount <= 0}>
          {busy ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />} Charge {money(applyAmount + (tip || 0))}
        </button>
      </>}
    >
      {paid ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div className="amount-due">
            <div className="small muted">Paid in full</div>
            <div className="amount-due-value gradient-text">{money(order.total)}</div>
            {lastChange ? <div className="strong text-success" style={{ marginTop: 6, fontSize: 18 }}>Change due: {money(lastChange)}</div> : null}
          </div>
          <div className="small muted">{order.payments.map((p: any) => `${PAYMENT_LABELS[p.method]} ${money(p.amount)}`).join(' · ')}</div>
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div>
            <div className="amount-due">
              <div className="small muted">Balance due</div>
              <div className="amount-due-value gradient-text">{money(method === 'CASH' ? cashDue : balance)}</div>
              <div className="small muted">Total {money(order.total)} · Paid {money(order.paidAmount)}</div>
            </div>
            {order.payments.length > 0 && (
              <div className="card" style={{ padding: 8, marginBottom: 10 }}>
                {order.payments.map((p: any) => (
                  <div key={p.id} className="totals-row"><span>{PAYMENT_LABELS[p.method]}{p.tip ? ` (+${money(p.tip)} tip)` : ''}</span><span>{money(p.amount)}</span></div>
                ))}
              </div>
            )}
            <div className="form-section-title" style={{ marginTop: 0 }}>Split bill</div>
            <div className="row row-wrap">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} className={`chip${splitWays === n ? ' active' : ''}`} onClick={() => { setSplitWays(n); setAmount(''); }}>{n === 1 ? 'Full' : `${n} ways`}</button>
              ))}
            </div>
            {splitWays > 1 && <p className="small muted" style={{ marginTop: 6 }}>{splitWays} guests × {money(balance / splitWays)}</p>}
          </div>

          <div>
            <div className="form-section-title" style={{ marginTop: 0 }}>Tender</div>
            <div className="tender-grid" style={{ marginBottom: 10 }}>
              {methods.map((m) => (
                <button key={m.value} className={`tender-btn${method === m.value ? ' selected' : ''}`} onClick={() => { setMethod(m.value); setTendered(''); }}>
                  {m.icon}{PAYMENT_LABELS[m.value]}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Amount to apply"><input className="form-input" type="number" step="0.01" value={amount} placeholder={applyAmount.toFixed(2)} onChange={(e) => setAmount(e.target.value)} /></Field>
              {method === 'CASH' ? (
                <Field label="Cash tendered"><input className="form-input" type="number" step="0.01" value={tendered} placeholder={applyAmount.toFixed(2)} onChange={(e) => setTendered(e.target.value)} /></Field>
              ) : (
                <Field label={method === 'GIFT_CARD' ? 'Gift card #' : 'Reference / auth code'}><input className="form-input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
              )}
            </div>
            {method === 'CASH' && (
              <>
                <div className="quick-cash" style={{ marginBottom: 8 }}>
                  {quickCash.map((v) => <button key={v} className="btn btn-secondary btn-sm" onClick={() => setTendered(String(v))}>{money(v)}</button>)}
                </div>
                <div className="totals-row strong"><span>Change</span><span className="text-success">{money(change)}</span></div>
                {rounding > 0 && <div className="small muted">Cash rounded to nearest {money(rounding)}</div>}
              </>
            )}
            {method === 'LOYALTY' && order.customer && (
              <p className="small muted">{order.customer.loyaltyPoints} points available · worth {money(order.customer.loyaltyPoints * (settings?.loyalty.pointValue || 0))}</p>
            )}
            {settings?.pos.tipping && (
              <>
                <div className="form-section-title">Tip</div>
                <div className="row row-wrap">
                  <button className={`chip${!tip ? ' active' : ''}`} onClick={() => setTip(0)}>No tip</button>
                  {(settings.pos.tipPresets || []).map((p) => {
                    const v = round2((tipBase * p) / 100);
                    return <button key={p} className={`chip${tip === v ? ' active' : ''}`} onClick={() => setTip(v)}>{p}% · {money(v)}</button>;
                  })}
                  <input className="form-input" style={{ width: 80, height: 26 }} type="number" placeholder="Custom" onChange={(e) => setTip(parseFloat(e.target.value) || 0)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PaymentModal;
