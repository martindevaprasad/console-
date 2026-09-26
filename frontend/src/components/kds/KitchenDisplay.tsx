import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IconCheck, IconRotate, IconMaximize, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { useApi, useCurrentLocation, useMutate } from '@/hooks';
import { ORDERS } from '@/services/api';
import { ORDER_TYPE_LABELS } from '@/lib/constants';
import { Empty, Segmented } from '../shared/ui';

const WARN_MIN = 8;
const LATE_MIN = 15;

const elapsed = (from: string, now: number) => {
  const s = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  return { min: Math.floor(s / 60), text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` };
};

export const KitchenDisplay: React.FC = () => {
  const location = useCurrentLocation();
  const mutate = useMutate();
  const stations = (location?.stations || []).filter((s) => s.isActive);
  const [stationId, setStationId] = useState<string>(() => localStorage.getItem('kds-station') || 'ALL');
  const [view, setView] = useState<'active' | 'ready'>('active');
  const [sound, setSound] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { data, reload } = useApi(ORDERS.KDS, { locationId: location?.id, stationId: stationId === 'ALL' ? null : stationId }, { skip: !location, pollMs: 5000 });

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { localStorage.setItem('kds-station', stationId); }, [stationId]);

  const tickets = useMemo(() => {
    const list = (data?.kitchenTickets || []).map((o: any) => {
      const items = o.items.filter((i: any) => ['FIRED', 'PREPARING', 'READY'].includes(i.status) && (stationId === 'ALL' || i.stationId === stationId));
      const firedAt = items.reduce((m: string, i: any) => (i.firedAt && (!m || i.firedAt < m) ? i.firedAt : m), '') || o.createdAt;
      const allReady = items.length > 0 && items.every((i: any) => i.status === 'READY');
      return { ...o, items, firedAt, allReady };
    }).filter((o: any) => o.items.length > 0);
    return list.filter((o: any) => (view === 'ready' ? o.allReady : !o.allReady));
  }, [data, stationId, view]);

  // Audible cue when new tickets arrive
  const count = tickets.length;
  const [prevCount, setPrevCount] = useState(0);
  useEffect(() => {
    if (sound && view === 'active' && count > prevCount) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch { /* audio not available */ }
    }
    setPrevCount(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const toggleItem = async (item: any) => {
    const next = item.status === 'READY' ? 'FIRED' : item.status === 'FIRED' ? 'PREPARING' : 'READY';
    try { await mutate(ORDERS.ITEM_STATUS, { itemIds: [item.id], status: next }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const bump = async (o: any) => {
    try { await mutate(ORDERS.BUMP, { orderId: o.id, stationId: stationId === 'ALL' ? null : stationId }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const recall = async (o: any) => {
    try { await mutate(ORDERS.ITEM_STATUS, { itemIds: o.items.map((i: any) => i.id), status: 'FIRED' }); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  const late = tickets.filter((t: any) => elapsed(t.firedAt, now).min >= LATE_MIN).length;

  return (
    <div className="kds-shell">
      <div className="toolbar">
        <Segmented value={stationId} onChange={setStationId} options={[{ value: 'ALL', label: 'All stations' }, ...stations.map((s) => ({ value: s.id, label: s.name }))]} />
        <Segmented value={view} onChange={setView} options={[{ value: 'active', label: 'In progress' }, { value: 'ready', label: 'Ready / recall' }]} />
        <div className="spacer" />
        <span className="badge badge-info">{tickets.length} tickets</span>
        {late > 0 && <span className="badge badge-danger">{late} late</span>}
        <button className="btn btn-ghost btn-icon btn-sm" title="Sound" onClick={() => setSound(!sound)}>{sound ? <IconVolume size={14} /> : <IconVolumeOff size={14} />}</button>
        <button className="btn btn-ghost btn-icon btn-sm" title="Fullscreen" onClick={() => document.documentElement.requestFullscreen?.()}><IconMaximize size={14} /></button>
      </div>

      {!tickets.length ? (
        <Empty title={view === 'active' ? 'All caught up' : 'Nothing ready'} hint="New tickets appear automatically when orders are sent." />
      ) : (
        <div className="kds-grid">
          {tickets.map((o: any) => {
            const t = elapsed(o.firedAt, now);
            const tone = o.allReady ? 'ready' : t.min >= LATE_MIN ? 'late' : t.min >= WARN_MIN ? 'warn' : '';
            return (
              <div key={o.id} className={`kds-ticket ${tone}`}>
                <div className="kds-head">
                  <div>
                    <div className="kds-num">#{o.ticketNumber}</div>
                    <div className="kds-meta">
                      {ORDER_TYPE_LABELS[o.orderType]}{o.table ? ` · ${o.table.name}` : ''}{o.guestCount ? ` · ${o.guestCount} pax` : ''}
                      {o.channel !== 'POS' ? ` · ${o.channel}` : ''}
                    </div>
                  </div>
                  <div className={`kds-timer ${tone === 'late' ? 'text-danger' : tone === 'warn' ? 'text-warning' : ''}`}>{t.text}</div>
                </div>
                <div className="kds-items">
                  {o.items.map((i: any) => (
                    <div key={i.id} className={`kds-item${i.status === 'READY' ? ' done' : ''}`} onClick={() => toggleItem(i)}>
                      <span className="kds-item-qty">{i.quantity}×</span>
                      <div>
                        <div className="kds-item-name">{i.name}{i.seat ? <span className="muted small"> · S{i.seat}</span> : null}{i.status === 'PREPARING' && <span className="badge badge-warning" style={{ marginLeft: 4 }}>cooking</span>}</div>
                        {(i.modifiers || []).length > 0 && <div className="kds-item-mods">{i.modifiers.map((m: any) => m.name).join(' · ')}</div>}
                        {i.notes && <div className="kds-item-mods">⚠ {i.notes}</div>}
                      </div>
                    </div>
                  ))}
                  {o.notes && <div className="small text-warning">Note: {o.notes}</div>}
                </div>
                <div className="kds-foot">
                  {view === 'active' ? (
                    <button className="btn btn-success btn-block btn-sm" onClick={() => bump(o)}><IconCheck size={13} /> Bump</button>
                  ) : (
                    <div className="row">
                      <button className="btn btn-secondary btn-block btn-sm" onClick={() => recall(o)}><IconRotate size={13} /> Recall</button>
                      <button className="btn btn-success btn-block btn-sm" onClick={() => bump(o)}><IconCheck size={13} /> Served</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
