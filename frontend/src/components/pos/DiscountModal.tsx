import React, { useState } from 'react';
import { IconDiscount2 } from '@tabler/icons-react';
import Modal from '../shared/Modal';
import { money } from '@/lib/format';
import { Field, Segmented } from '../shared/ui';

export interface DiscountChoice { discountId?: string; type?: 'PERCENT' | 'FIXED'; value?: number; reason?: string; label: string }

export const DiscountModal: React.FC<{
  open: boolean;
  promotions: any[];
  approvalLimit: number;
  onClose: () => void;
  onApply: (d: DiscountChoice) => void;
  onRemove?: () => void;
}> = ({ open, promotions, approvalLimit, onClose, onApply, onRemove }) => {
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const v = parseFloat(value) || 0;
  const needsApproval = type === 'FIXED' || v > approvalLimit;

  return (
    <Modal isOpen={open} onClose={onClose} title="Discounts & promotions" size="lg"
      footer={<>
        {onRemove && <button className="btn btn-danger" onClick={onRemove}>Remove discount</button>}
        <div className="spacer" />
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!v || !reason} onClick={() => onApply({ type, value: v, reason, label: type === 'PERCENT' ? `${v}% off` : `${money(v)} off` })}>
          Apply manual discount
        </button>
      </>}
    >
      {promotions.length > 0 && (
        <>
          <div className="form-section-title" style={{ marginTop: 0 }}>Active promotions</div>
          <div className="option-grid" style={{ marginBottom: 12 }}>
            {promotions.map((p) => (
              <button key={p.id} className="option-btn" onClick={() => onApply({ discountId: p.id, label: p.name })}>
                <span><IconDiscount2 size={12} /> {p.name}</span>
                <small>{p.type === 'PERCENT' ? `${p.value}%` : money(p.value)}</small>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="form-section-title">Manual discount</div>
      <div className="form-grid">
        <Field label="Type">
          <Segmented value={type} onChange={setType} options={[{ value: 'PERCENT', label: 'Percent' }, { value: 'FIXED', label: 'Amount' }]} />
        </Field>
        <Field label={type === 'PERCENT' ? 'Percent off' : 'Amount off'}>
          <input className="form-input" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Reason (required, audited)" full>
          <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason…</option>
            {['Staff meal', 'Guest complaint', 'Manager comp', 'Loyal regular', 'Service recovery', 'Price match', 'Other'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      {needsApproval && v > 0 && <p className="small text-warning">Discounts above {approvalLimit}% or fixed amounts need manager approval.</p>}
    </Modal>
  );
};

export default DiscountModal;
