import React, { useEffect, useMemo, useState } from 'react';
import { IconMinus, IconPlus, IconCheck } from '@tabler/icons-react';
import Modal from '../shared/Modal';
import { money } from '@/lib/format';
import { Field } from '../shared/ui';

export interface LineDraft {
  key: string;
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  modifierIds: string[];
  modifiers: { id: string; name: string; price: number; group: string }[];
  notes?: string;
  seat?: number | null;
  course: number;
  priceOverride?: number | null;
}

interface Props {
  product: any | null;
  initial?: LineDraft | null;
  showSeats: boolean;
  showCourses: boolean;
  guestCount: number;
  onClose: () => void;
  onConfirm: (line: LineDraft) => void;
}

export const ModifierModal: React.FC<Props> = ({ product, initial, showSeats, showCourses, guestCount, onClose, onConfirm }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [seat, setSeat] = useState<number | null>(null);
  const [course, setCourse] = useState(1);
  const [openPrice, setOpenPrice] = useState<string>('');

  const groups = product?.modifierGroups || [];

  useEffect(() => {
    if (!product) return;
    if (initial) {
      setSelected(initial.modifierIds); setQty(initial.quantity); setNotes(initial.notes || '');
      setSeat(initial.seat ?? null); setCourse(initial.course); setOpenPrice(initial.priceOverride != null ? String(initial.priceOverride) : '');
    } else {
      // Pre-select defaults for required groups
      setSelected(groups.flatMap((g: any) => g.minSelect > 0 ? g.modifiers.filter((m: any) => m.isDefault && m.isActive).slice(0, g.minSelect).map((m: any) => m.id) : []));
      setQty(1); setNotes(''); setSeat(null); setCourse(product.category?.name?.match(/dessert/i) ? 3 : product.category?.name?.match(/starter|appet/i) ? 1 : 2);
      setOpenPrice(product.isOpenPrice ? '' : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, initial]);

  const allMods = useMemo(() => new Map(groups.flatMap((g: any) => g.modifiers.map((m: any) => [m.id, { ...m, group: g.name, groupId: g.id }]))), [groups]);

  const toggle = (g: any, id: string) => {
    const inGroup = selected.filter((s) => (allMods.get(s) as any)?.groupId === g.id);
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (g.maxSelect === 1) {
      setSelected([...selected.filter((s) => !inGroup.includes(s)), id]);
    } else if (inGroup.length < g.maxSelect) {
      setSelected([...selected, id]);
    }
  };

  const invalid = groups.find((g: any) => selected.filter((s) => (allMods.get(s) as any)?.groupId === g.id).length < g.minSelect);
  const base = product?.isOpenPrice && openPrice !== '' ? parseFloat(openPrice) || 0 : product?.price || 0;
  const unit = base + selected.reduce((s, id) => s + ((allMods.get(id) as any)?.price || 0), 0);

  if (!product) return null;

  const confirm = () => {
    onConfirm({
      key: initial?.key || `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      name: product.name,
      basePrice: base,
      unitPrice: unit,
      taxRate: product.tax?.rate ?? 0,
      quantity: qty,
      modifierIds: selected,
      modifiers: selected.map((id) => { const m: any = allMods.get(id); return { id, name: m.name, price: m.price, group: m.group }; }),
      notes: notes || undefined,
      seat,
      course,
      priceOverride: product.isOpenPrice && openPrice !== '' ? base : null,
    });
  };

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      title={product.name}
      size="lg"
      footer={
        <div className="row" style={{ width: '100%' }}>
          <div className="row">
            <button className="btn btn-secondary btn-icon" onClick={() => setQty(Math.max(1, qty - 1))}><IconMinus size={14} /></button>
            <span className="strong" style={{ minWidth: 24, textAlign: 'center' }}>{qty}</span>
            <button className="btn btn-secondary btn-icon" onClick={() => setQty(qty + 1)}><IconPlus size={14} /></button>
          </div>
          <div className="spacer" />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!!invalid || (product.isOpenPrice && openPrice === '')} onClick={confirm}>
            <IconCheck size={14} /> {initial ? 'Update' : 'Add'} · {money(unit * qty)}
          </button>
        </div>
      }
    >
      {product.description && <p className="small muted" style={{ marginBottom: 10 }}>{product.description}</p>}
      {product.isOpenPrice && (
        <Field label="Price (open item)"><input className="form-input" type="number" step="0.01" autoFocus value={openPrice} onChange={(e) => setOpenPrice(e.target.value)} /></Field>
      )}
      {groups.map((g: any) => {
        const count = selected.filter((s) => (allMods.get(s) as any)?.groupId === g.id).length;
        return (
          <div key={g.id} style={{ marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="form-section-title" style={{ margin: 0 }}>{g.name}</span>
              <span className={`badge ${g.minSelect > 0 ? (count >= g.minSelect ? 'badge-success' : 'badge-warning') : 'badge-neutral'}`}>
                {g.minSelect > 0 ? 'Required' : 'Optional'} · {g.maxSelect === 1 ? 'choose 1' : `up to ${g.maxSelect}`}
              </span>
            </div>
            <div className="option-grid">
              {g.modifiers.filter((m: any) => m.isActive).map((m: any) => (
                <button key={m.id} className={`option-btn${selected.includes(m.id) ? ' selected' : ''}`} onClick={() => toggle(g, m.id)}>
                  <span>{m.name}</span>{m.price ? <small>+{money(m.price)}</small> : null}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="form-grid">
        {showSeats && (
          <Field label="Seat">
            <select className="form-select" value={seat ?? ''} onChange={(e) => setSeat(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Shared</option>
              {Array.from({ length: Math.max(guestCount, 1) }, (_, i) => <option key={i + 1} value={i + 1}>Seat {i + 1}</option>)}
            </select>
          </Field>
        )}
        {showCourses && (
          <Field label="Course">
            <select className="form-select" value={course} onChange={(e) => setCourse(Number(e.target.value))}>
              <option value={1}>1 · Starters</option><option value={2}>2 · Mains</option><option value={3}>3 · Desserts</option><option value={4}>4 · Other</option>
            </select>
          </Field>
        )}
        <Field label="Kitchen note" full>
          <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. no onions, allergy: nuts" />
        </Field>
      </div>
    </Modal>
  );
};

export default ModifierModal;
