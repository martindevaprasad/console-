import React from 'react';

export type TableStatus =
  | 'AVAILABLE'
  | 'SEATED'
  | 'ORDERING'
  | 'WAITING_FOR_FOOD'
  | 'READY_FOR_PAYMENT'
  | 'NEEDS_CLEANING';

interface Props {
  status: TableStatus;
  className?: string;
}

// Tailwind-style class keys kept for use as lookup keys in FloorPlanView colour maps
export const statusColors: Record<TableStatus, { bg: string; text: string; border: string }> = {
  AVAILABLE:          { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300'  },
  SEATED:             { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300'   },
  ORDERING:           { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  WAITING_FOR_FOOD:   { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  READY_FOR_PAYMENT:  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  NEEDS_CLEANING:     { bg: 'bg-gray-100',   text: 'text-gray-800',   border: 'border-gray-300'   },
};

const statusLabels: Record<TableStatus, string> = {
  AVAILABLE:         'Available',
  SEATED:            'Seated',
  ORDERING:          'Ordering',
  WAITING_FOR_FOOD:  'Waiting for Food',
  READY_FOR_PAYMENT: 'Ready for Payment',
  NEEDS_CLEANING:    'Needs Cleaning',
};

const badgeStyles: Record<TableStatus, React.CSSProperties> = {
  AVAILABLE:         { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
  SEATED:            { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
  ORDERING:          { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' },
  WAITING_FOR_FOOD:  { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' },
  READY_FOR_PAYMENT: { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' },
  NEEDS_CLEANING:    { background: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db' },
};

export const TableStatusBadge: React.FC<Props> = ({ status }) => {
  const label = statusLabels[status] || status.replace(/_/g, ' ');
  const style = badgeStyles[status] || badgeStyles.AVAILABLE;

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      ...style,
    }}>
      {label}
    </span>
  );
};
