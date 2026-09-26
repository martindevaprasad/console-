import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext } from '@/hooks';
import { api, INVENTORY } from '@/services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import Modal from '../shared/Modal';

export const InventoryDashboard: React.FC = () => {
  const { locationId, token } = useMultiTenantContext();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock edit form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [minStock, setMinStock] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const loadData = async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      const data = await api.query(INVENTORY.LIST, { locationId }, token);
      setItems(data.inventories);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationId, token]);

  const openUpdateModal = (item: any) => {
    setActiveItem(item);
    setQuantity(item.quantity.toString());
    setMinStock(item.minStock.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !minStock) { toast.error('Please input stock metrics'); return; }
    setSubmitLoading(true);

    try {
      await api.mutation(
        INVENTORY.UPDATE,
        {
          productId: activeItem.productId,
          locationId,
          quantity: parseInt(quantity),
          minStock: parseInt(minStock),
        },
        token
      );
      toast.success('Stock adjusted successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Stock modification failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!locationId) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">📍</div>
          <div className="empty-state-title">Select Location</div>
          <p className="text-xs text-muted">Please select a location in the navigation bar to view inventory.</p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Connecting stock level monitors..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Inventory Controls</h1>
        <p className="page-subtitle">Track, reconcile, and monitor current stock replenishment triggers</p>
      </div>

      <div className="glass-card-static" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Current Qty</th>
                <th>Min Alert Threshold</th>
                <th>Stock Level</th>
                <th>Reorder Recommendation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.quantity <= item.minStock;
                const percentage = Math.max(0, Math.min(100, (item.quantity / item.minStock) * 100));

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.product?.name || 'Product'}</td>
                    <td>{item.product?.sku || <span className="text-muted">—</span>}</td>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ color: isLow ? 'var(--color-danger-light)' : 'var(--text-primary)' }}>
                        {item.quantity} {item.unit || 'units'}
                      </span>
                    </td>
                    <td>{item.minStock} {item.unit || 'units'}</td>
                    <td style={{ width: 140 }}>
                      <div className="stock-level">
                        <div className="stock-bar">
                          <div
                            className={`stock-fill ${isLow ? 'critical' : 'good'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-danger">⚠️ Replenish Stock</span>
                      ) : (
                        <span className="badge badge-success">Optimal</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openUpdateModal(item)}>
                        ⚙️ Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Inventory Reconciliation Adjustment"
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? 'Updating...' : 'Post Adjustments'}
            </button>
          </div>
        }
      >
        {activeItem && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
              <span className="text-xs text-muted">Product</span>
              <div className="font-semibold text-sm">{activeItem.product?.name}</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-qty">Actual Stock On-Hand Count</label>
              <input
                id="inv-qty"
                type="number"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-min">Minimum Alert Stock Threshold</label>
              <input
                id="inv-min"
                type="number"
                className="form-input"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                required
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InventoryDashboard;
