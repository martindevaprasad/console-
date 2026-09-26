import React, { useState } from 'react';
import { TableStatus } from './TableStatusBadge';
import { IconUsers, IconShoppingCart, IconCash, IconX } from '@tabler/icons-react';

interface Props {
  table: any;
  onClose: () => void;
  onSeat: (guestCount: number) => void;
  onTakeOrder: () => void;
  onCheckout: () => void;
}

const canSeat = (status: TableStatus) => status === 'AVAILABLE' || status === 'NEEDS_CLEANING';

export const TableActionsModal: React.FC<Props> = ({ table, onClose, onSeat, onTakeOrder, onCheckout }) => {
  const [guestCount, setGuestCount] = useState(2);
  const status = (table.status || 'AVAILABLE') as TableStatus;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-bg-primary)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '28px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid var(--color-border)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{table.name}</h2>
            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Capacity: {table.capacity}</span>
              <span style={{
                padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: status === 'AVAILABLE' ? '#dcfce7' : status === 'SEATED' ? '#dbeafe' : status === 'NEEDS_CLEANING' ? '#f3f4f6' : '#ffedd5',
                color: status === 'AVAILABLE' ? '#166534' : status === 'SEATED' ? '#1e40af' : status === 'NEEDS_CLEANING' ? '#374151' : '#9a3412',
              }}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '8px' }}>
            <IconX size={22} />
          </button>
        </div>

        {canSeat(status) ? (
          /* Seat Guests UI */
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', marginTop: 0 }}>Seat Guests</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--text-primary)' }}
              >−</button>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '40px', textAlign: 'center' }}>{guestCount}</span>
              <button
                onClick={() => setGuestCount(Math.min(table.capacity + 4, guestCount + 1))}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--text-primary)' }}
              >+</button>
            </div>
            <button
              onClick={() => onSeat(guestCount)}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <IconUsers size={18} /> Seat {guestCount} Guest{guestCount !== 1 ? 's' : ''}
            </button>
          </div>
        ) : (
          /* Active Table Actions */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={onTakeOrder}
              style={{
                padding: '14px', borderRadius: '12px', border: '1px solid #e9d5ff',
                background: '#f5f3ff', color: '#6b21a8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <IconShoppingCart size={20} /> Take / View Order
            </button>
            <button
              onClick={onCheckout}
              style={{
                padding: '14px', borderRadius: '12px', border: '1px solid #fed7aa',
                background: '#fff7ed', color: '#9a3412',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <IconCash size={20} /> Checkout / Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
