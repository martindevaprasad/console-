import React from 'react';
import { MARK_PATHS } from '../layout/AppSvgs';

// Illustrations for the public landing page. Everything is inline SVG so the
// page ships with no image assets.

/** The MaGe mark with its hidden cloche & toque outlines drawn at full strength. */
export const MarkGlow: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 8 36 36" fill="none" aria-hidden>
    <rect y="8" width="36" height="36" rx="11.0495" fill="#5E84FF" />
    <path d={MARK_PATHS.dome} stroke="#67FFCC" strokeOpacity="0.55" strokeWidth="0.35" />
    <path d={MARK_PATHS.crown} stroke="#67FFCC" strokeOpacity="0.55" strokeWidth="0.35" />
    <path d={MARK_PATHS.fold} fill="#050B1F" />
  </svg>
);

/**
 * "Clo", the mascot: the cloche from the logo wearing the toque. `shades` swaps
 * the eyes for sunglasses (the end-of-shift version).
 */
export const Mascot: React.FC<{ size?: number; shades?: boolean; className?: string }> = ({ size = 140, shades, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 140 140" fill="none" aria-hidden>
    {/* toque */}
    <g className="lp-mascot-hat">
      <path d="M44 46c-10 0-16-8-13-17 3-8 12-10 18-7 2-9 11-15 21-15s19 6 21 15c6-3 15-1 18 7 3 9-3 17-13 17z" fill="#fff" stroke="#0B1640" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M46 44h48v14H46z" fill="#fff" stroke="#0B1640" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M58 30c2-5 6-7 10-7" stroke="#0B1640" strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
    </g>
    {/* cloche */}
    <path d="M14 112c0-30 25-54 56-54s56 24 56 54z" fill="#67FFCC" stroke="#0B1640" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M28 98c4-13 14-23 27-28" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".7" />
    <rect x="6" y="110" width="128" height="12" rx="6" fill="#5E84FF" stroke="#0B1640" strokeWidth="3.5" />
    {shades ? (
      <g>
        <path d="M40 82h60" stroke="#0B1640" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="42" y="80" width="23" height="15" rx="4" fill="#0B1640" />
        <rect x="75" y="80" width="23" height="15" rx="4" fill="#0B1640" />
        <path d="M46 84h4M50 88h4M79 84h4M83 88h4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    ) : (
      <g className="lp-mascot-eyes">
        <circle cx="54" cy="86" r="7.5" fill="#fff" stroke="#0B1640" strokeWidth="3" />
        <circle cx="86" cy="86" r="7.5" fill="#fff" stroke="#0B1640" strokeWidth="3" />
        <circle cx="56" cy="87" r="3.4" fill="#0B1640" />
        <circle cx="88" cy="87" r="3.4" fill="#0B1640" />
      </g>
    )}
    <path d="M60 100c6 5 14 5 20 0" stroke="#0B1640" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="70" cy="58" r="4" fill="#5E84FF" stroke="#0B1640" strokeWidth="3" />
  </svg>
);

/** A café parasol + table, used to dot the hills instead of trees. */
const Parasol: React.FC<{ x: number; y: number; s?: number; c?: string }> = ({ x, y, s = 1, c = '#FFB020' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 0v46" stroke="#7A4A2A" strokeWidth="4" />
    <path d="M-34 4C-28-12-14-20 0-20S28-12 34 4c-6-4-11-4-17 0-6-4-11-4-17 0-6-4-11-4-17 0-6-4-11-4-17 0z" fill={c} />
    <path d="M-17 4c2-12 8-20 17-24M17 4c-2-12-8-20-17-24" stroke="#000" strokeOpacity=".12" strokeWidth="2" fill="none" />
    <rect x="-16" y="40" width="32" height="5" rx="2.5" fill="#7A4A2A" />
  </g>
);

/** Rolling hills with a blue river — the scene at the foot of the hero and the features band. */
export const Landscape: React.FC<{ className?: string; river?: boolean }> = ({ className, river = true }) => (
  <svg className={className} viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden>
    <path d="M0 150C180 70 340 60 520 120s320 70 470 10 300-80 450-20V300H0z" fill="#0F7A6B" />
    <path d="M0 200c160-60 330-80 520-30s300 60 480 0 290-50 440 0V300H0z" fill="#12A67A" />
    {river && <path d="M640 300c30-50 40-90 120-120s170-20 200-50" stroke="#5E84FF" strokeWidth="38" fill="none" strokeLinecap="round" />}
    {river && <path d="M640 300c30-50 40-90 120-120s170-20 200-50" stroke="#9DB4FF" strokeWidth="10" fill="none" strokeLinecap="round" opacity=".7" />}
    <path d="M0 250c200-40 400-40 620-10s420 30 820-20V300H0z" fill="#1BC48A" />
    <Parasol x={170} y={176} s={0.9} />
    <Parasol x={330} y={150} s={0.7} c="#FF6B6B" />
    <Parasol x={1110} y={150} s={0.8} c="#67FFCC" />
    <Parasol x={1290} y={180} s={1} />
    <Parasol x={900} y={196} s={0.6} c="#FF6B6B" />
  </svg>
);

/** Night-sky clouds for the hero backdrop. */
export const Clouds: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <g fill="#2E5BD8" opacity=".35">
      <path d="M60 330a50 50 0 0 1 90-30 60 60 0 0 1 110 10 40 40 0 0 1 50 40H60z" />
      <path d="M1100 300a55 55 0 0 1 100-30 65 65 0 0 1 120 10 45 45 0 0 1 60 40h-280z" />
      <path d="M1250 120a30 30 0 0 1 55-18 38 38 0 0 1 70 6 26 26 0 0 1 35 25h-160z" />
    </g>
    <g fill="#fff">
      {[[120, 60], [300, 140], [520, 40], [760, 90], [980, 30], [1180, 70], [1380, 180], [880, 200], [220, 220]].map(([x, y], i) => (
        <circle key={i} className="lp-star" cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </g>
  </svg>
);
