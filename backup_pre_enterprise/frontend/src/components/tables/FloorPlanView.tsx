import React, { useState, useEffect, useCallback } from 'react';
import { api, TABLE_MANAGEMENT } from '../../services/api';
import { useAuth } from '@/hooks';
import { TableStatusBadge, statusColors, TableStatus } from './TableStatusBadge';
import { TableActionsModal } from './TableActionsModal';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface FloorPlanViewProps {
  locationId: string;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({ locationId }) => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const selectedZoneIdRef = React.useRef<string | null>(null);

  const fetchZones = useCallback(async () => {
    try {
      const data = await api.query(TABLE_MANAGEMENT.ZONES, { locationId }, token);
      const zonesData = data.zones || [];
      setZones(zonesData);
      if (zonesData.length > 0 && !selectedZoneIdRef.current) {
        const firstId = zonesData[0].id;
        selectedZoneIdRef.current = firstId;
        setSelectedZoneId(firstId);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  }, [locationId, token]);

  const fetchZonesRef = React.useRef(fetchZones);
  fetchZonesRef.current = fetchZones;

  useEffect(() => {
    fetchZonesRef.current();
    const interval = setInterval(() => fetchZonesRef.current(), 10000);
    return () => clearInterval(interval);
  }, [locationId]);

  const handleSeat = async (guestCount: number) => {
    if (!selectedTable) return;
    try {
      await api.mutation(TABLE_MANAGEMENT.SEAT_TABLE, { id: selectedTable.id, guestCount }, token);
      toast.success('Guests seated!');
      setSelectedTable(null);
      fetchZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seat guests');
    }
  };

  const handleTakeOrder = () => {
    if (!selectedTable) return;
    navigate('/pos?tableId=' + selectedTable.id);
  };

  const handleCheckout = async () => {
    if (!selectedTable) return;
    try {
      await api.mutation(TABLE_MANAGEMENT.CHECKOUT_TABLE, { id: selectedTable.id }, token);
      toast.success('Table checked out!');
      setSelectedTable(null);
      fetchZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to checkout');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Loading floor plan...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-danger)' }}>
        {error}
      </div>
    );
  }

  const activeZone = zones.find((z: any) => z.id === selectedZoneId) || zones[0];

  // Colour mappings (tailwind => hex) for statusColors
  const bgHex: Record<string, string> = {
    'bg-green-100': '#dcfce7', 'bg-blue-100': '#dbeafe', 'bg-purple-100': '#f3e8ff',
    'bg-yellow-100': '#fef9c3', 'bg-orange-100': '#ffedd5', 'bg-gray-100': '#f3f4f6',
  };
  const borderHex: Record<string, string> = {
    'border-green-300': '#86efac', 'border-blue-300': '#93c5fd', 'border-purple-300': '#d8b4fe',
    'border-yellow-300': '#fde047', 'border-orange-300': '#fdba74', 'border-gray-300': '#d1d5db',
  };
  const textHex: Record<string, string> = {
    'text-green-800': '#166534', 'text-blue-800': '#1e40af', 'text-purple-800': '#6b21a8',
    'text-yellow-800': '#854d0e', 'text-orange-800': '#9a3412', 'text-gray-800': '#1f2937',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Zone Tabs */}
      <div style={{
        display: 'flex', gap: '8px', padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {zones.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px' }}>
            No zones configured. Use the Editor tab to add zones and tables.
          </span>
        ) : (
          zones.map((zone: any) => (
            <button
              key={zone.id}
              onClick={() => {
                selectedZoneIdRef.current = zone.id;
                setSelectedZoneId(zone.id);
              }}
              style={{
                padding: '6px 18px', borderRadius: '20px',
                fontWeight: 500, fontSize: '14px', cursor: 'pointer',
                whiteSpace: 'nowrap', border: 'none',
                background: selectedZoneId === zone.id ? 'var(--color-primary)' : 'var(--color-bg-primary)',
                color: selectedZoneId === zone.id ? '#fff' : 'var(--text-secondary)',
                boxShadow: selectedZoneId === zone.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {zone.name}
            </button>
          ))
        )}
      </div>

      {/* Status Legend */}
      <div style={{ display: 'flex', gap: '10px', padding: '8px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>Legend:</span>
        {(['AVAILABLE', 'SEATED', 'ORDERING', 'WAITING_FOR_FOOD', 'READY_FOR_PAYMENT', 'NEEDS_CLEANING'] as TableStatus[]).map((s) => (
          <TableStatusBadge key={s} status={s} />
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'auto', padding: '24px', background: 'var(--color-bg-secondary)' }}>
        {activeZone && activeZone.tables.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No tables in this zone. Use the Editor tab to add tables.
          </div>
        )}

        {activeZone && activeZone.tables.map((table: any) => {
          const status = (table.status || 'AVAILABLE') as TableStatus;
          const colors = statusColors[status] || statusColors.AVAILABLE;
          const isRound = table.shape === 'ROUND';

          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              title={table.name + ' — ' + status.replace(/_/g, ' ')}
              style={{
                position: 'absolute',
                left: table.x + 'px', top: table.y + 'px',
                width: table.width + 'px', height: table.height + 'px',
                borderRadius: isRound ? '50%' : '10px',
                background: bgHex[colors.bg] || '#f3f4f6',
                border: '2px solid ' + (borderHex[colors.border] || '#d1d5db'),
                color: textHex[colors.text] || '#1f2937',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{table.name}</span>
              <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{table.capacity} seats</span>
            </button>
          );
        })}
      </div>

      {/* Action Modal */}
      {selectedTable && (
        <TableActionsModal
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          onSeat={handleSeat}
          onTakeOrder={handleTakeOrder}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
};

export default FloorPlanView;
