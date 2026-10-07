import React from 'react';

// Restaurant line-art drawn on a 48×48 grid, stroke only. Each icon carries the
// product area it stands for, shown as a tooltip on hover.
interface LineIcon { label: string; x: number; y: number; size: number; rot: number; depth: number; paths: string[] }

const ICONS: LineIcon[] = [
  { label: 'Kitchen display · tickets fired', x: 5, y: 9, size: 58, rot: -10, depth: 18,
    paths: ['M14 30c-4 0-7-3-7-7s3-7 7-7c1-4 5-7 10-7s9 3 10 7c4 0 7 3 7 7s-3 7-7 7', 'M14 30v9h20v-9', 'M14 34h20'] },
  { label: 'Order ready · served hot', x: 74, y: 5, size: 64, rot: 6, depth: 10,
    paths: ['M5 36h38', 'M9 36c0-8.3 6.7-15 15-15s15 6.7 15 15', 'M24 21v-3', 'M21 18h6', 'M14 30c1.5-3 4-5 7-6'] },
  { label: 'Bar KDS · espresso x2', x: 89, y: 27, size: 50, rot: 8, depth: 24,
    paths: ['M10 20h24v10a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z', 'M34 23h3a4 4 0 0 1 0 8h-3', 'M17 8c-2 3 2 5 0 8', 'M24 8c-2 3 2 5 0 8'] },
  { label: 'Menu · 86 a slice in one tap', x: 58, y: 17, size: 46, rot: -14, depth: 30,
    paths: ['M24 42 8 12c10-5 22-5 32 0z', 'M10.5 17c8.5-3.5 18.5-3.5 27 0', 'M19 23a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M25 30a2 2 0 1 0 4 0a2 2 0 1 0-4 0'] },
  { label: 'Modifiers · no onion, extra cheese', x: 3, y: 47, size: 54, rot: 7, depth: 14,
    paths: ['M8 22c0-7 7-12 16-12s16 5 16 12z', 'M7 27h34', 'M8 32h32', 'M9 32v2a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4v-2', 'M18 16h1M24 14h1M29 17h1'] },
  { label: 'Table service · cutlery set', x: 92, y: 55, size: 48, rot: -6, depth: 20,
    paths: ['M13 6v10M17 6v10M21 6v10', 'M13 16a4 4 0 0 0 8 0', 'M17 20v22', 'M33 42V6c4 3 6 9 6 16h-6'] },
  { label: 'Wine list · by the glass', x: 70, y: 70, size: 44, rot: 10, depth: 28,
    paths: ['M16 6h16c0 10-3 16-8 16s-8-6-8-16z', 'M17 12h14', 'M24 22v16', 'M17 42h14'] },
  { label: 'Recipes · cost per bowl', x: 13, y: 83, size: 56, rot: -4, depth: 12,
    paths: ['M6 24h36c0 9-8 16-18 16S6 33 6 24z', 'M18 8c-2 3 2 5 0 8', 'M24 6c-2 3 2 5 0 8', 'M30 8c-2 3 2 5 0 8'] },
  { label: 'Checkout · split 3 ways', x: 41, y: 91, size: 42, rot: 12, depth: 26,
    paths: ['M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z', 'M17 14h14M17 20h14M17 26h8', 'M27 33h4'] },
  { label: 'Floor plan · table 7 seated', x: 86, y: 87, size: 56, rot: -8, depth: 16,
    paths: ['M14 17a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z', 'M18 8h4M26 8h4M18 40h4M26 40h4', 'M8 22v4M40 22v4'] },
  { label: 'Promotions · happy hour', x: 33, y: 4, size: 40, rot: 14, depth: 34,
    paths: ['M8 24a16 16 0 1 0 32 0a16 16 0 1 0-32 0', 'M19 24a5 5 0 1 0 10 0a5 5 0 1 0-10 0', 'M17 13l2 2M31 14l-2 2M13 27l2 1M35 30l-2 1M27 35l-1 2'] },
  { label: 'Inventory · reorder queued', x: 50, y: 60, size: 40, rot: -12, depth: 36,
    paths: ['M20 6h8v8l4 6v20a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V20l4-6z', 'M16 26h16', 'M16 34h16'] },
];

const Layer: React.FC<{ lit?: boolean }> = ({ lit }) => (
  <div className={`food-layer${lit ? ' food-layer-lit' : ''}`} aria-hidden>
    {ICONS.map((ic, i) => (
      <div key={i} className="food-icon" data-label={lit ? undefined : ic.label}
        style={{ left: `${ic.x}%`, top: `${ic.y}%`, width: ic.size, height: ic.size, '--depth': ic.depth, '--i': i } as React.CSSProperties}>
        <div className="food-icon-float" style={{ '--rot': `${ic.rot}deg` } as React.CSSProperties}>
          <svg viewBox="0 0 48 48" width={ic.size} height={ic.size}>
            {ic.paths.map((d, j) => <path key={j} d={d} pathLength={1} />)}
          </svg>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Floating food & restaurant outlines. A dim base layer sits under a bright copy
 * that only shows through a spotlight around the pointer (`--px`/`--py` on a parent);
 * `--mx`/`--my` (-1…1) drive a gentle parallax.
 */
export const FoodLineArt: React.FC = () => (
  <>
    <Layer />
    <Layer lit />
  </>
);

export default FoodLineArt;
