import React, { useState } from 'react';
import { IconUsers, IconShoppingCart, IconCash, IconSparkles, IconMinus, IconPlus } from '@tabler/icons-react';
import Modal from '../shared/Modal';
import { TableStatusBadge, TableStatus } from './TableStatusBadge';
import { money, minutesSince } from '@/lib/format';

interface Props {
  table: any;
  onClose: () => void;
  onSeat: (guestCount: number) => void;
  onTakeOrder: () => void;
  onCheckout: () => void;
  onMarkClean: () => void;
}

export const TableActionsModal: React.FC<Props> = ({ table, onClose, onSeat, onTakeOrder, onCheckout, onMarkClean }) => {
  const [guests, setGuests] = useState(Math.min(2, table.capacity));
  const status = (table.status || 'AVAILABLE') as TableStatus;
  const free = status === 'AVAILABLE';

  return (
    <Modal isOpen onClose={onClose} title={`${table.name} · ${table.capacity} seats`}>
      <div className="row" style={{ marginBottom: 12 }}>
        <TableStatusBadge status={status} />
        {table.activeSession && <span className="small muted">{table.activeSession.guestCount} guests · seated {minutesSince(table.activeSession.startTime)} min{table.activeSession.server ? ` · ${table.activeSession.server.name}` : ''}</span>}
      </div>

      {table.currentOrder && (
        <div className="card row" style={{ marginBottom: 12 }}>
          <div>
            <div className="strong">Check #{table.currentOrder.ticketNumber}</div>
            <div className="small muted">Opened {minutesSince(table.currentOrder.createdAt)} min ago</div>
          </div>
          <div className="spacer" />
          <div className="strong text-accent">{money(table.currentOrder.balanceDue)}</div>
        </div>
      )}

      {(free || status === 'NEEDS_CLEANING') && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="form-section-title" style={{ marginTop: 0 }}>Seat guests</div>
          <div className="row" style={{ justifyContent: 'center', marginBottom: 10 }}>
            <button className="btn btn-secondary btn-icon" onClick={() => setGuests(Math.max(1, guests - 1))}><IconMinus size={14} /></button>
            <span className="kpi-value" style={{ minWidth: 40, textAlign: 'center' }}>{guests}</span>
            <button className="btn btn-secondary btn-icon" onClick={() => setGuests(guests + 1)}><IconPlus size={14} /></button>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => onSeat(guests)}><IconUsers size={14} /> Seat {guests} guest{guests !== 1 ? 's' : ''}</button>
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        {!free && status !== 'NEEDS_CLEANING' && (
          <button className="btn btn-primary btn-block" onClick={onTakeOrder}><IconShoppingCart size={14} /> {table.currentOrder ? 'Open check in POS' : 'Start order'}</button>
        )}
        {free && <button className="btn btn-secondary btn-block" onClick={onTakeOrder}><IconShoppingCart size={14} /> Quick order (seat & order)</button>}
        {!free && status !== 'NEEDS_CLEANING' && !table.currentOrder && (
          <button className="btn btn-secondary btn-block" onClick={onCheckout}><IconCash size={14} /> Close table</button>
        )}
        {status === 'NEEDS_CLEANING' && <button className="btn btn-success btn-block" onClick={onMarkClean}><IconSparkles size={14} /> Mark clean & available</button>}
      </div>
    </Modal>
  );
};

export default TableActionsModal;
