import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TABLE_MANAGEMENT } from '../../services/api';
import { useApi, useMutate } from '@/hooks';
import { TABLE_STATUS_STYLE } from '@/lib/constants';
import { money, minutesSince } from '@/lib/format';
import { TableStatusBadge, TableStatus } from './TableStatusBadge';
import { TableActionsModal } from './TableActionsModal';
import { Empty } from '../shared/ui';

export const FloorPlanView: React.FC<{ locationId: string }> = ({ locationId }) => {
  const navigate = useNavigate();
  const mutate = useMutate();
  const { data, loading, error, reload } = useApi(TABLE_MANAGEMENT.ZONES, { locationId }, { pollMs: 10000 });
  const zones = data?.zones || [];
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (zones.length && !zones.some((z: any) => z.id === zoneId)) setZoneId(zones[0].id);
  }, [zones, zoneId]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); toast.success(ok); setSelected(null); reload(true); } catch (e: any) { toast.error(e.message); }
  };

  if (loading && !data) return <div className="loading-overlay">Loading floor plan…</div>;
  if (error) return <div className="loading-overlay text-danger">{error}</div>;
  if (!zones.length) return <Empty title="No floor plan yet" hint="Use the Floor editor tab to add zones and tables." />;

  const zone = zones.find((z: any) => z.id === zoneId) || zones[0];
  const all = zones.flatMap((z: any) => z.tables);
  const counts = all.reduce((acc: any, t: any) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="pos-bar">
        <div className="row row-wrap" style={{ gap: 4 }}>
          {zones.map((z: any) => (
            <button key={z.id} className={`chip${z.id === zone.id ? ' active' : ''}`} onClick={() => setZoneId(z.id)}>
              {z.name} <span style={{ opacity: 0.7 }}>{z.tables.filter((t: any) => t.status !== 'AVAILABLE').length}/{z.tables.length}</span>
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="row row-wrap" style={{ gap: 4 }}>
          {Object.keys(TABLE_STATUS_STYLE).map((s) => <TableStatusBadge key={s} status={s as TableStatus} count={counts[s] || 0} />)}
        </div>
      </div>

      <div className="floor-canvas" style={{ flex: 1, overflow: 'auto' }}>
        {zone.tables.map((t: any) => {
          const s = TABLE_STATUS_STYLE[t.status] || TABLE_STATUS_STYLE.AVAILABLE;
          const since = t.activeSession ? minutesSince(t.activeSession.startTime) : null;
          return (
            <button key={t.id} className="floor-table" onClick={() => setSelected(t)} title={`${t.name} — ${s.label}`}
              style={{ left: t.x, top: t.y, width: t.width, height: t.height, borderRadius: t.shape === 'ROUND' ? '50%' : 10, background: s.bg, borderColor: s.color, color: 'var(--text-primary)' }}>
              <span className="floor-table-name">{t.name}</span>
              <span className="floor-table-meta">
                {t.activeSession ? `${t.activeSession.guestCount}/${t.capacity} · ${since}m` : `${t.capacity} seats`}
              </span>
              {t.currentOrder && <span className="floor-table-meta" style={{ color: s.color, fontWeight: 700 }}>{money(t.currentOrder.balanceDue)}</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <TableActionsModal
          table={selected}
          onClose={() => setSelected(null)}
          onSeat={(guests) => run(() => mutate(TABLE_MANAGEMENT.SEAT_TABLE, { id: selected.id, guestCount: guests }), `${selected.name} seated`)}
          onTakeOrder={() => navigate(`/pos?tableId=${selected.id}`)}
          onCheckout={() => run(() => mutate(TABLE_MANAGEMENT.CHECKOUT_TABLE, { id: selected.id }), `${selected.name} closed`)}
          onMarkClean={() => run(() => mutate(TABLE_MANAGEMENT.UPDATE_STATUS, { id: selected.id, status: 'AVAILABLE' }), `${selected.name} is available`)}
        />
      )}
    </div>
  );
};

export default FloorPlanView;
