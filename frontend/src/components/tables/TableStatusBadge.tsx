import React from 'react';
import { TABLE_STATUS_STYLE } from '@/lib/constants';

export type TableStatus =
  | 'AVAILABLE'
  | 'SEATED'
  | 'ORDERING'
  | 'WAITING_FOR_FOOD'
  | 'READY_FOR_PAYMENT'
  | 'NEEDS_CLEANING';

export const TableStatusBadge: React.FC<{ status: TableStatus; count?: number }> = ({ status, count }) => {
  const s = TABLE_STATUS_STYLE[status] || TABLE_STATUS_STYLE.AVAILABLE;
  return (
    <span className="badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}` }}>
      {s.label}{count !== undefined ? ` · ${count}` : ''}
    </span>
  );
};

export default TableStatusBadge;
