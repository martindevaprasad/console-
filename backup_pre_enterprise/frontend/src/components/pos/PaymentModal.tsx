import React from 'react';
import Modal from '../shared/Modal';
import { IconCash, IconCreditCard, IconDeviceMobile, IconTarget } from '@tabler/icons-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

const METHODS = [
  { value: 'CASH', label: 'Cash', icon: <IconCash size={28} />, description: 'Immediate cash tender' },
  { value: 'CARD', label: 'Credit/Debit', icon: <IconCreditCard size={28} />, description: 'External card reader terminal' },
  { value: 'DIGITAL', label: 'Digital Pay', icon: <IconDeviceMobile size={28} />, description: 'NFC, UPI, or QR scan wallet' },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  paymentMethod,
  setPaymentMethod,
  notes,
  setNotes,
  onConfirm,
  loading,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Ticket Settlement"
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={onConfirm} disabled={loading}>
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing...</>
            ) : (
              <><IconTarget size={18} /> Confirm Settlement</>
            )}
          </button>
        </div>
      }
    >
      <div style={{ textAlign: 'center', margin: '12px 0 24px 0' }}>
        <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Grand Total Due</div>
        <div className="gradient-text font-extrabold" style={{ fontSize: 'var(--font-size-4xl)' }}>
          ${total.toFixed(2)}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Choose Payment Medium</label>
        <div className="payment-methods">
          {METHODS.map((method) => (
            <button
              key={method.value}
              className={`payment-method-btn ${paymentMethod === method.value ? 'selected' : ''}`}
              onClick={() => setPaymentMethod(method.value)}
              type="button"
            >
              <div className="payment-method-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {method.icon}
              </div>
              <div>{method.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Transaction Notes / Instructions</label>
        <textarea
          className="form-input"
          style={{ minHeight: 80, resize: 'vertical' }}
          placeholder="e.g. Table 4, parcel delivery details, custom cuts..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default PaymentModal;
