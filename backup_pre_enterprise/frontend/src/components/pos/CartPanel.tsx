import React from 'react';
import { CartItem } from '@/store/productSlice';
import { IconTrash, IconShoppingCart, IconCreditCard } from '@tabler/icons-react';

interface CartPanelProps {
  cart: CartItem[];
  subtotal: number;
  taxRate: number;
  discount: number;
  setDiscount: (discount: number) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onClear: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  subtotal,
  taxRate,
  discount,
  setDiscount,
  onUpdateQty,
  onRemove,
  onCheckout,
  onClear,
}) => {
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;

  return (
    <div className="pos-cart">
      <div className="pos-cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Current Ticket</h3>
        {cart.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconTrash size={14} /> Clear
          </button>
        )}
      </div>

      <div className="pos-cart-body">
        {cart.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShoppingCart size={32} />
            </div>
            <div className="empty-state-title" style={{ fontSize: 'var(--font-size-sm)' }}>Empty Ticket</div>
            <p className="text-xs text-muted">Select items from catalog to start checkout.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="cart-item">
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">${item.price.toFixed(2)}</div>
              </div>
              <div className="cart-quantity-controls">
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
                >
                  -
                </button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pos-cart-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div className="cart-total-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="cart-total-row">
            <span>Tax ({taxRate}%)</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
          <div className="cart-total-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Discount ($)</span>
            <input
              type="number"
              className="form-input"
              style={{ width: 80, padding: '4px 8px', fontSize: 12, textAlign: 'right' }}
              value={discount || ''}
              placeholder="0.00"
              onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>
          <div className="cart-total-row grand-total">
            <span>Total</span>
            <span style={{ color: 'var(--color-accent-light)' }}>${Math.max(0, total).toFixed(2)}</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          disabled={cart.length === 0}
          onClick={onCheckout}
        >
          <IconCreditCard size={18} /> Pay & Print
        </button>
      </div>
    </div>
  );
};

export default CartPanel;
