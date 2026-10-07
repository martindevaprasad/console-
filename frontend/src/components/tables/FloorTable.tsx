import React from 'react';

const CHAIR_W = 18;
const CHAIR_H = 16;
const CHAIR_GAP = 5;
const SEAT_OFFSET = CHAIR_GAP + CHAIR_H / 2;

/** Room kept around the floor edge so chairs of tables at x/y = 0 aren't clipped. */
export const FLOOR_PAD = CHAIR_H + CHAIR_GAP + 8;

type Seat = { x: number; y: number; rot: number };

const along = (n: number, len: number) => Array.from({ length: n }, (_, i) => (len * (i + 0.5)) / n);

/**
 * Chair centres relative to the table's top-left corner, in fill order:
 * opposite sides alternate so a party of two sits facing each other.
 * `rot` turns the chair so its back faces away from the table (0 = above the table).
 */
export const seatLayout = (shape: string, capacity: number, w: number, h: number): Seat[] => {
  const n = Math.max(0, capacity);
  if (!n) return [];

  if (shape === 'ROUND') {
    const rx = w / 2 + SEAT_OFFSET, ry = h / 2 + SEAT_OFFSET;
    const ring = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { x: w / 2 + rx * Math.cos(a), y: h / 2 + ry * Math.sin(a), rot: (a * 180) / Math.PI + 90 };
    });
    const half = Math.ceil(n / 2);
    return Array.from({ length: n }, (_, i) => ring[i % 2 ? half + (i >> 1) : i >> 1]);
  }

  const horizontal = w >= h;
  const ends = n >= 4 ? 2 : n === 3 ? 1 : 0;
  const sideA = Math.ceil((n - ends) / 2);
  const sideB = n - ends - sideA;
  const len = horizontal ? w : h;

  // Side A is top (or left), side B is bottom (or right); ends sit on the short sides.
  const a: Seat[] = along(sideA, len).map((p) => horizontal ? { x: p, y: -SEAT_OFFSET, rot: 0 } : { x: -SEAT_OFFSET, y: p, rot: -90 });
  const b: Seat[] = along(sideB, len).map((p) => horizontal ? { x: p, y: h + SEAT_OFFSET, rot: 180 } : { x: w + SEAT_OFFSET, y: p, rot: 90 });
  const e: Seat[] = (horizontal
    ? [{ x: -SEAT_OFFSET, y: h / 2, rot: -90 }, { x: w + SEAT_OFFSET, y: h / 2, rot: 90 }]
    : [{ x: w / 2, y: -SEAT_OFFSET, rot: 0 }, { x: w / 2, y: h + SEAT_OFFSET, rot: 180 }]
  ).slice(0, ends);

  const seats: Seat[] = [];
  for (let i = 0; i < sideA; i++) { seats.push(a[i]); if (b[i]) seats.push(b[i]); }
  return [...seats, ...e];
};

const Chair: React.FC<Seat & { filled: boolean; color: string }> = ({ x, y, rot, filled, color }) => (
  <svg className={`floor-chair${filled ? ' filled' : ''}`} width={CHAIR_W} height={CHAIR_H} viewBox="0 0 18 16" aria-hidden
    style={{ left: x - CHAIR_W / 2, top: y - CHAIR_H / 2, transform: `rotate(${rot}deg)`, color: filled ? color : undefined }}>
    <rect x="2.5" y="0.75" width="13" height="3.5" rx="1.5" />
    <rect x="1" y="5.75" width="16" height="9.5" rx="2.5" />
    <path className="floor-chair-slats" d="M6 8.5v4.5M9 8.5v4.5M12 8.5v4.5" />
  </svg>
);

interface FloorTableProps extends React.HTMLAttributes<HTMLDivElement> {
  table: { x: number; y: number; width: number; height: number; shape: string; capacity: number };
  /** Number of chairs drawn as taken. */
  occupied: number;
  /** Fill colour for taken chairs. */
  accent: string;
  bodyStyle?: React.CSSProperties;
}

/** A floor-plan table with its chairs drawn around it. */
export const FloorTable: React.FC<FloorTableProps> = ({ table: t, occupied, accent, bodyStyle, style, className, children, ...rest }) => (
  <div {...rest} className={`floor-table${className ? ` ${className}` : ''}`}
    style={{ left: t.x + FLOOR_PAD, top: t.y + FLOOR_PAD, width: t.width, height: t.height, ...style }}>
    {seatLayout(t.shape, t.capacity, t.width, t.height).map((s, i) => (
      <Chair key={i} {...s} filled={i < occupied} color={accent} />
    ))}
    <div className="floor-table-body" style={{ borderRadius: t.shape === 'ROUND' ? '50%' : 12, ...bodyStyle }}>{children}</div>
  </div>
);

export default FloorTable;
