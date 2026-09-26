import React, { useState, useEffect, useCallback } from 'react';
import { api, TABLE_MANAGEMENT } from '../../services/api';
import { useAuth } from '@/hooks';
import toast from 'react-hot-toast';
import { IconPlus, IconTable } from '@tabler/icons-react';

interface FloorPlanEditorProps {
  locationId: string;
}

const SHAPES = ['RECTANGLE', 'ROUND'];

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({ locationId }) => {
  const { token } = useAuth();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneName, setZoneName] = useState('');

  const [showTableForm, setShowTableForm] = useState(false);
  const [tableForm, setTableForm] = useState({
    name: '', capacity: 4, shape: 'RECTANGLE',
    x: 50, y: 50, width: 100, height: 80,
  });

  const fetchZones = useCallback(async () => {
    try {
      const data = await api.query(TABLE_MANAGEMENT.ZONES, { locationId }, token);
      setZones(data.zones || []);
      if (data.zones?.length > 0 && !selectedZoneId) {
        setSelectedZoneId(data.zones[0].id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [locationId, token, selectedZoneId]);

  useEffect(() => { fetchZones(); }, [locationId]);

  const handleCreateZone = async () => {
    if (!zoneName.trim()) return;
    try {
      await api.mutation(TABLE_MANAGEMENT.CREATE_ZONE, { locationId, name: zoneName.trim() }, token);
      toast.success(`Zone "${zoneName}" created!`);
      setZoneName('');
      setShowZoneForm(false);
      fetchZones();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create zone');
    }
  };

  const handleCreateTable = async () => {
    if (!selectedZoneId || !tableForm.name.trim()) return;
    try {
      await api.mutation(TABLE_MANAGEMENT.CREATE_TABLE, {
        zoneId: selectedZoneId,
        name: tableForm.name.trim(),
        capacity: tableForm.capacity,
        shape: tableForm.shape,
        x: tableForm.x, y: tableForm.y,
        width: tableForm.width, height: tableForm.height,
      }, token);
      toast.success('Table added!');
      setTableForm({ name: '', capacity: 4, shape: 'RECTANGLE', x: 50, y: 50, width: 100, height: 80 });
      setShowTableForm(false);
      fetchZones();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create table');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Loading editor...
      </div>
    );
  }

  const activeZone = zones.find((z: any) => z.id === selectedZoneId);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left Panel */}
      <div style={{
        width: '260px', borderRight: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)', display: 'flex',
        flexDirection: 'column', padding: '16px', gap: '12px', overflowY: 'auto', flexShrink: 0,
      }}>
        {/* Zones header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: '15px' }}>Zones</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowZoneForm(!showZoneForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IconPlus size={14} /> Add
          </button>
        </div>

        {showZoneForm && (
          <div style={{ padding: '12px', background: 'var(--color-bg-primary)', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              className="form-input"
              placeholder="Zone name (e.g. Main Dining)"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateZone()}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateZone} style={{ flex: 1 }}>Create</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowZoneForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {zones.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
            No zones yet. Create one to get started.
          </p>
        ) : (
          zones.map((zone: any) => (
            <button key={zone.id} onClick={() => setSelectedZoneId(zone.id)}
              style={{
                padding: '10px 14px', borderRadius: '8px', textAlign: 'left',
                background: selectedZoneId === zone.id ? 'var(--color-primary)' : 'var(--color-bg-primary)',
                color: selectedZoneId === zone.id ? '#fff' : 'var(--text-primary)',
                border: selectedZoneId === zone.id ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s',
              }}
            >
              {zone.name}
              <span style={{ display: 'block', fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                {zone.tables?.length || 0} table(s)
              </span>
            </button>
          ))
        )}

        {selectedZoneId && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => setShowTableForm(!showTableForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconPlus size={14} /> Add Table
            </button>

            {showTableForm && (
              <div style={{ padding: '12px', background: 'var(--color-bg-primary)', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input className="form-input" placeholder="Table name (e.g. T1)"
                  value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Capacity</label>
                    <input className="form-input" type="number" min={1} value={tableForm.capacity}
                      onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 2 })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Shape</label>
                    <select className="form-input" value={tableForm.shape}
                      onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })}>
                      {SHAPES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>X (px)</label>
                    <input className="form-input" type="number" value={tableForm.x}
                      onChange={(e) => setTableForm({ ...tableForm, x: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Y (px)</label>
                    <input className="form-input" type="number" value={tableForm.y}
                      onChange={(e) => setTableForm({ ...tableForm, y: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Width</label>
                    <input className="form-input" type="number" value={tableForm.width}
                      onChange={(e) => setTableForm({ ...tableForm, width: parseInt(e.target.value) || 80 })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Height</label>
                    <input className="form-input" type="number" value={tableForm.height}
                      onChange={(e) => setTableForm({ ...tableForm, height: parseInt(e.target.value) || 80 })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateTable} style={{ flex: 1 }}>Add Table</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowTableForm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Panel - Grid preview */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'auto',
        backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        background: 'var(--color-bg-secondary)',
      }}>
        {!activeZone ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select or create a zone on the left
          </div>
        ) : activeZone.tables?.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Add tables using the panel on the left
          </div>
        ) : null}

        {activeZone?.tables?.map((table: any) => {
          const isRound = table.shape === 'ROUND';
          return (
            <div key={table.id} style={{
              position: 'absolute',
              left: table.x + 'px', top: table.y + 'px',
              width: table.width + 'px', height: table.height + 'px',
              borderRadius: isRound ? '50%' : '10px',
              background: 'var(--color-bg-primary)',
              border: '2px solid var(--color-primary)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              <IconTable size={18} color="var(--color-primary)" />
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>{table.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{table.capacity} seats</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
