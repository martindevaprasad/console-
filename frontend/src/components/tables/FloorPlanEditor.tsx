import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { IconPlus, IconTrash, IconPencil, IconCircle, IconSquare } from '@tabler/icons-react';
import { api, TABLE_MANAGEMENT } from '../../services/api';
import { useAuth } from '@/hooks';
import { Field } from '../shared/ui';

interface FloorPlanEditorProps {
  locationId: string;
}

const GRID = 10;
const snap = (v: number) => Math.max(0, Math.round(v / GRID) * GRID);

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({ locationId }) => {
  const { token } = useAuth();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchZones = useCallback(async () => {
    try {
      const data = await api.query(TABLE_MANAGEMENT.ZONES, { locationId }, token);
      setZones(data.zones || []);
      setZoneId((cur) => cur && data.zones.some((z: any) => z.id === cur) ? cur : data.zones[0]?.id || null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [locationId, token]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const zone = zones.find((z) => z.id === zoneId);
  const selected = zone?.tables.find((t: any) => t.id === selectedId);

  const patchLocal = (id: string, patch: any) =>
    setZones((zs) => zs.map((z) => ({ ...z, tables: z.tables.map((t: any) => (t.id === id ? { ...t, ...patch } : t)) })));

  const saveTable = async (id: string, input: any) => {
    try { await api.mutation(TABLE_MANAGEMENT.UPDATE_TABLE, { id, input }, token); } catch (e: any) { toast.error(e.message); fetchZones(); }
  };

  const createZone = async () => {
    if (!zoneName.trim()) return;
    try {
      const res = await api.mutation(TABLE_MANAGEMENT.CREATE_ZONE, { locationId, name: zoneName.trim() }, token);
      setZoneName('');
      await fetchZones();
      setZoneId(res.createZone.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const renameZone = async () => {
    if (!zone) return;
    const name = window.prompt('Zone name', zone.name);
    if (!name) return;
    try { await api.mutation(TABLE_MANAGEMENT.UPDATE_ZONE, { id: zone.id, name }, token); fetchZones(); } catch (e: any) { toast.error(e.message); }
  };

  const deleteZone = async () => {
    if (!zone || !window.confirm(`Delete zone "${zone.name}" and all its tables?`)) return;
    try { await api.mutation(TABLE_MANAGEMENT.DELETE_ZONE, { id: zone.id }, token); setZoneId(null); fetchZones(); } catch (e: any) { toast.error(e.message); }
  };

  const addTable = async (shape: 'RECTANGLE' | 'ROUND') => {
    if (!zone) return;
    const n = zone.tables.length + 1;
    try {
      const res = await api.mutation(TABLE_MANAGEMENT.CREATE_TABLE, {
        zoneId: zone.id, name: `T${n}`, capacity: shape === 'ROUND' ? 2 : 4, shape,
        x: 20 + ((n - 1) % 6) * 120, y: 20 + Math.floor((n - 1) / 6) * 110, width: shape === 'ROUND' ? 80 : 100, height: 80,
      }, token);
      await fetchZones();
      setSelectedId(res.createTable.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteTable = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    try { await api.mutation(TABLE_MANAGEMENT.DELETE_TABLE, { id: selected.id }, token); setSelectedId(null); fetchZones(); } catch (e: any) { toast.error(e.message); }
  };

  const onPointerDown = (e: React.PointerEvent, t: any) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    setSelectedId(t.id);
    setDrag({ id: t.id, dx: e.clientX - rect.left + canvasRef.current!.scrollLeft - t.x, dy: e.clientY - rect.top + canvasRef.current!.scrollTop - t.y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    patchLocal(drag.id, {
      x: snap(e.clientX - rect.left + canvasRef.current.scrollLeft - drag.dx),
      y: snap(e.clientY - rect.top + canvasRef.current.scrollTop - drag.dy),
    });
  };

  const onPointerUp = () => {
    if (!drag) return;
    const t = zone?.tables.find((x: any) => x.id === drag.id);
    if (t) saveTable(t.id, { x: t.x, y: t.y });
    setDrag(null);
  };

  if (loading) return <div className="loading-overlay">Loading editor…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', padding: 12, overflowY: 'auto' }}>
        <div className="form-section-title" style={{ marginTop: 0 }}>Zones</div>
        <div className="stack" style={{ gap: 4, marginBottom: 8 }}>
          {zones.map((z) => (
            <button key={z.id} className={`pos-cat${z.id === zoneId ? ' active' : ''}`} onClick={() => { setZoneId(z.id); setSelectedId(null); }}>
              {z.name}<span className="spacer" /><span className="small muted">{z.tables.length}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 4 }}>
          <input className="form-input" placeholder="New zone" value={zoneName} onChange={(e) => setZoneName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createZone()} />
          <button className="btn btn-primary btn-icon" onClick={createZone}><IconPlus size={14} /></button>
        </div>

        {zone && (
          <>
            <div className="row" style={{ marginTop: 8, gap: 4 }}>
              <button className="btn btn-secondary btn-sm" onClick={renameZone}><IconPencil size={12} /> Rename</button>
              <button className="btn btn-danger btn-sm" onClick={deleteZone}><IconTrash size={12} /></button>
            </div>
            <div className="form-section-title">Add table</div>
            <div className="row" style={{ gap: 4 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => addTable('RECTANGLE')}><IconSquare size={12} /> Square</button>
              <button className="btn btn-secondary btn-sm" onClick={() => addTable('ROUND')}><IconCircle size={12} /> Round</button>
            </div>
          </>
        )}

        {selected && (
          <>
            <div className="form-section-title">Table {selected.name}</div>
            <Field label="Name"><input className="form-input" value={selected.name} onChange={(e) => patchLocal(selected.id, { name: e.target.value })} onBlur={() => saveTable(selected.id, { name: selected.name })} /></Field>
            <div className="form-grid">
              <Field label="Seats"><input className="form-input" type="number" min={1} value={selected.capacity} onChange={(e) => patchLocal(selected.id, { capacity: parseInt(e.target.value) || 1 })} onBlur={() => saveTable(selected.id, { capacity: selected.capacity })} /></Field>
              <Field label="Shape">
                <select className="form-select" value={selected.shape} onChange={(e) => { patchLocal(selected.id, { shape: e.target.value }); saveTable(selected.id, { shape: e.target.value }); }}>
                  <option value="RECTANGLE">Square</option><option value="ROUND">Round</option>
                </select>
              </Field>
              <Field label="Width"><input className="form-input" type="number" value={selected.width} onChange={(e) => patchLocal(selected.id, { width: parseInt(e.target.value) || 60 })} onBlur={() => saveTable(selected.id, { width: selected.width })} /></Field>
              <Field label="Height"><input className="form-input" type="number" value={selected.height} onChange={(e) => patchLocal(selected.id, { height: parseInt(e.target.value) || 60 })} onBlur={() => saveTable(selected.id, { height: selected.height })} /></Field>
            </div>
            <button className="btn btn-danger btn-sm btn-block" onClick={deleteTable}><IconTrash size={12} /> Delete table</button>
          </>
        )}
        <p className="small muted" style={{ marginTop: 12 }}>Drag tables to arrange them. Changes save automatically.</p>
      </div>

      <div ref={canvasRef} className="floor-canvas" style={{ overflow: 'auto', touchAction: 'none' }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
        {!zone && <div className="loading-overlay">Create a zone to start designing your floor.</div>}
        {zone?.tables.map((t: any) => (
          <div key={t.id} className="floor-table" onPointerDown={(e) => onPointerDown(e, t)}
            style={{
              left: t.x, top: t.y, width: t.width, height: t.height, borderRadius: t.shape === 'ROUND' ? '50%' : 10,
              background: t.id === selectedId ? 'var(--color-primary-glow)' : 'var(--color-surface)',
              borderColor: t.id === selectedId ? 'var(--color-primary)' : 'var(--color-border-hover)',
              color: 'var(--text-primary)', cursor: drag?.id === t.id ? 'grabbing' : 'grab',
            }}>
            <span className="floor-table-name">{t.name}</span>
            <span className="floor-table-meta">{t.capacity} seats</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloorPlanEditor;
