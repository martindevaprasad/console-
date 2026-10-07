import React, { useEffect, useState } from 'react';
import { MARK_PATHS } from '../layout/AppSvgs';

type Part = 'dome' | 'crown' | 'fold';

const PARTS: { key: Part; name: string; note: string }[] = [
  { key: 'dome', name: 'The cloche', note: 'every plate that leaves the pass' },
  { key: 'crown', name: 'The toque', note: 'the kitchen working behind it' },
  { key: 'fold', name: 'The fold', note: 'a line that only goes up' },
];

/**
 * The MaGe mark at hero size. Its cloche and toque outlines ship at 14% opacity
 * in the real logo; hovering (or the intro) draws them in at full strength.
 */
export const MarkReveal: React.FC = () => {
  const [intro, setIntro] = useState(true);
  const [hover, setHover] = useState(false);
  const [part, setPart] = useState<Part | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), 3600);
    return () => window.clearTimeout(t);
  }, []);

  const revealed = intro || hover || part !== null;
  const cls = (p: Part) => `mark-line${part === p ? ' focus' : ''}${part && part !== p ? ' dim' : ''}`;

  return (
    <div className={`mark-reveal${revealed ? ' revealed' : ''}`}>
      <button type="button" className="mark-reveal-logo" aria-label="Reveal the shapes hidden in the MaGe mark"
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
        <svg viewBox="0 8 36 36" width="112" height="112" aria-hidden>
          <rect y="8" width="36" height="36" rx="11.0495" fill="#5E84FF" />
          <path d={MARK_PATHS.fold} className={`mark-fold${part === 'fold' ? ' focus' : ''}`} pathLength={1} />
          <path d={MARK_PATHS.dome} className={cls('dome')} pathLength={1} />
          <path d={MARK_PATHS.crown} className={cls('crown')} pathLength={1} />
        </svg>
      </button>

      <div className="mark-reveal-copy">
        <div className="mark-reveal-eyebrow">Look closer at the mark</div>
        <p className="mark-reveal-lede">Two outlines hide in every MaGe logo, drawn at 14% opacity so you only find them when you look.</p>
        <ul className="mark-reveal-parts">
          {PARTS.map((p) => (
            <li key={p.key} className={part === p.key ? 'active' : undefined}
              onMouseEnter={() => setPart(p.key)} onMouseLeave={() => setPart(null)}>
              <span className={`mark-swatch mark-swatch-${p.key}`} />
              <strong>{p.name}</strong> <span>— {p.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MarkReveal;
