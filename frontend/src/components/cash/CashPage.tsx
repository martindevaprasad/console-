import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { IconLockOpen, IconLock, IconArrowDownRight, IconArrowUpRight, IconBuildingBank, IconPrinter } from '@tabler/icons-react';
import { useApi, useCurrentLocation, useMutate } from '@/hooks';
import { CASH } from '@/services/api';
import { money, dateTime, label } from '@/lib/format';
import { PAYMENT_LABELS } from '@/lib/constants';
import { PageHeader, Kpi, Field, Empty, Drawer } from '../shared/ui';
import Modal from '../shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner';

const ShiftReport: React.FC<{ shift: any }> = ({ shift }) => {
  const s = shift.summary;
  return (
    <div className="stack">
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <Kpi label="Gross sales" value={money(s.grossSales)} sub={`${s.orders} orders`} />
        <Kpi label="Refunds" tone="danger" value={money(s.refunds)} sub={`${s.cancelled} cancelled`} />
        <Kpi label="Tips" tone="success" value={money(s.tips)} />
        <Kpi label="Expected cash" tone="accent" value={money(s.expectedCash)} sub={`Float ${money(s.openingFloat)}`} />
      </div>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>Tender breakdown</div>
        <table className="data-table">
          <thead><tr><th>Method</th><th className="num">Count</th><th className="num">Sales</th><th className="num">Refunds</th><th className="num">Tips</th></tr></thead>
          <tbody>
            {Object.entries(s.byMethod).map(([k, v]: any) => (
              <tr key={k}><td>{PAYMENT_LABELS[k] || k}</td><td className="num">{v.count}</td><td className="num">{money(v.sales)}</td><td className="num">{money(v.refunds)}</td><td className="num">{money(v.tips)}</td></tr>
            ))}
            {!Object.keys(s.byMethod).length && <tr><td colSpan={5} className="muted small">No payments yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>Cash movements</div>
        <div className="totals-row"><span>Opening float</span><span>{money(s.openingFloat)}</span></div>
        <div className="totals-row"><span>Pay-ins</span><span>{money(s.payIns)}</span></div>
        <div className="totals-row"><span>Pay-outs</span><span>-{money(s.payOuts)}</span></div>
        <div className="totals-row"><span>Safe drops</span><span>-{money(s.drops)}</span></div>
        {shift.cashMovements.map((m: any) => (
          <div key={m.id} className="totals-row small muted"><span>{dateTime(m.createdAt)} · {label(m.type)} · {m.reason || '—'}</span><span>{money(m.amount)}</span></div>
        ))}
        {shift.status === 'CLOSED' && (
          <>
            <div className="divider" />
            <div className="totals-row"><span>Counted</span><span>{money(shift.closingCash)}</span></div>
            <div className={`totals-row strong ${shift.variance < 0 ? 'text-danger' : 'text-success'}`}><span>Variance (over/short)</span><span>{money(shift.variance)}</span></div>
          </>
        )}
      </div>
    </div>
  );
};

export const CashPage: React.FC = () => {
  const location = useCurrentLocation();
  const mutate = useMutate();
  const { data, loading, reload } = useApi(CASH.CURRENT, { locationId: location?.id }, { skip: !location });
  const history = useApi(CASH.LIST, { locationId: location?.id, limit: 30 }, { skip: !location });
  const [openFloat, setOpenFloat] = useState('200');
  const [move, setMove] = useState<{ type: string; amount: string; reason: string } | null>(null);
  const [closing, setClosing] = useState<{ cash: string; notes: string } | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const viewed = useApi(CASH.GET, { id: viewId }, { skip: !viewId });

  const shift = data?.currentShift;

  const open = async () => {
    try { await mutate(CASH.OPEN, { locationId: location?.id, openingFloat: parseFloat(openFloat) || 0 }); toast.success('Drawer opened'); reload(); history.reload(true); } catch (e: any) { toast.error(e.message); }
  };
  const doMove = async () => {
    try { await mutate(CASH.MOVE, { shiftId: shift.id, type: move!.type, amount: parseFloat(move!.amount), reason: move!.reason || null }); toast.success('Recorded'); setMove(null); reload(true); } catch (e: any) { toast.error(e.message); }
  };
  const close = async () => {
    try {
      const res = await mutate(CASH.CLOSE, { shiftId: shift.id, closingCash: parseFloat(closing!.cash) || 0, notes: closing!.notes || null });
      const v = res.closeShift.variance;
      toast.success(`Drawer closed · variance ${money(v)}`);
      setClosing(null); setViewId(res.closeShift.id); reload(); history.reload(true);
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <div className="page-container"><LoadingSpinner /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Cash & Shifts" subtitle={`${location?.name} · drawer reconciliation`}
        actions={shift && <>
          <button className="btn btn-secondary btn-sm" onClick={() => setMove({ type: 'PAY_IN', amount: '', reason: '' })}><IconArrowDownRight size={13} /> Pay in</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMove({ type: 'PAY_OUT', amount: '', reason: '' })}><IconArrowUpRight size={13} /> Pay out</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMove({ type: 'DROP', amount: '', reason: 'Safe drop' })}><IconBuildingBank size={13} /> Safe drop</button>
          <button className="btn btn-danger btn-sm" onClick={() => setClosing({ cash: '', notes: '' })}><IconLock size={13} /> Close drawer (Z)</button>
        </>} />

      {!shift ? (
        <div className="card" style={{ maxWidth: 420 }}>
          <div className="card-title">No open drawer at this location</div>
          <p className="small muted" style={{ margin: '4px 0 12px' }}>Count your starting cash and open a shift. Cash sales, refunds and tips are reconciled against it at close.</p>
          <Field label="Opening float"><input className="form-input" type="number" step="0.01" value={openFloat} onChange={(e) => setOpenFloat(e.target.value)} /></Field>
          <button className="btn btn-primary" onClick={open}><IconLockOpen size={14} /> Open drawer</button>
        </div>
      ) : (
        <>
          <p className="small muted" style={{ marginBottom: 10 }}>Opened {dateTime(shift.openedAt)} by {shift.user?.name}. X-report (live):</p>
          <ShiftReport shift={shift} />
        </>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>Shift history</div>
        {!history.data?.shifts.length ? <Empty title="No shifts yet" /> : (
          <table className="data-table">
            <thead><tr><th>Opened</th><th>Closed</th><th>By</th><th className="num">Float</th><th className="num">Expected</th><th className="num">Counted</th><th className="num">Variance</th></tr></thead>
            <tbody>
              {history.data.shifts.map((s: any) => (
                <tr key={s.id} className="clickable" onClick={() => setViewId(s.id)}>
                  <td>{dateTime(s.openedAt)}</td><td>{s.closedAt ? dateTime(s.closedAt) : <span className="badge badge-success">Open</span>}</td><td>{s.user?.name}</td>
                  <td className="num">{money(s.openingFloat)}</td><td className="num">{s.expectedCash != null ? money(s.expectedCash) : '—'}</td>
                  <td className="num">{s.closingCash != null ? money(s.closingCash) : '—'}</td>
                  <td className={`num strong ${s.variance < 0 ? 'text-danger' : s.variance > 0 ? 'text-success' : ''}`}>{s.variance != null ? money(s.variance) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!move} onClose={() => setMove(null)} title={label(move?.type)}
        footer={<><button className="btn btn-secondary" onClick={() => setMove(null)}>Cancel</button><button className="btn btn-primary" disabled={!(parseFloat(move?.amount || '0') > 0)} onClick={doMove}>Record</button></>}>
        {move && (
          <div className="form-grid">
            <Field label="Amount"><input className="form-input" type="number" step="0.01" autoFocus value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} /></Field>
            <Field label="Reason"><input className="form-input" value={move.reason} onChange={(e) => setMove({ ...move, reason: e.target.value })} placeholder="e.g. supplier COD, change float" /></Field>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!closing} onClose={() => setClosing(null)} title="Close drawer — blind count"
        footer={<><button className="btn btn-secondary" onClick={() => setClosing(null)}>Cancel</button><button className="btn btn-danger" disabled={closing?.cash === ''} onClick={close}>Close & print Z</button></>}>
        {closing && (
          <>
            <p className="small muted" style={{ marginBottom: 10 }}>Count all cash in the drawer. The expected amount is revealed after you submit.</p>
            <Field label="Counted cash"><input className="form-input" type="number" step="0.01" autoFocus value={closing.cash} onChange={(e) => setClosing({ ...closing, cash: e.target.value })} /></Field>
            <Field label="Notes"><input className="form-input" value={closing.notes} onChange={(e) => setClosing({ ...closing, notes: e.target.value })} /></Field>
          </>
        )}
      </Modal>

      <Drawer open={!!viewId} onClose={() => setViewId(null)} wide title="Shift report"
        footer={<button className="btn btn-secondary" onClick={() => window.print()}><IconPrinter size={14} /> Print</button>}>
        {viewed.data?.shift ? <ShiftReport shift={viewed.data.shift} /> : <LoadingSpinner />}
      </Drawer>
    </div>
  );
};

export default CashPage;
