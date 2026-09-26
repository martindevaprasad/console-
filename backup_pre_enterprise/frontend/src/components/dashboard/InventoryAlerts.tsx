import React from 'react';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface LowStockItem {
  id: string;
  quantity: number;
  minStock: number;
  product?: { name: string; price: number };
}

interface InventoryAlertsProps {
  alerts: LowStockItem[];
}

export const InventoryAlerts: React.FC<InventoryAlertsProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="glass-card-static p-6" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: 'var(--color-success)', marginBottom: 8 }}>
            <IconCheck size={32} />
          </div>
          <div className="font-semibold text-secondary">All Stocks Good</div>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>No low stock alerts currently.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-static" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconAlertCircle size={18} color="var(--color-danger-light)" /> Critical Inventory Alerts
        </h3>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
        {alerts.map((item) => {
          const percentage = Math.max(0, Math.min(100, (item.quantity / item.minStock) * 100));
          const colorClass = percentage < 30 ? 'critical' : 'low';

          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-semibold text-sm">{item.product?.name || 'Product'}</span>
                <span className={`badge ${percentage < 30 ? 'badge-danger' : 'badge-warning'}`}>
                  {item.quantity} left
                </span>
              </div>
              <div className="stock-level">
                <div className="stock-bar">
                  <div
                    className={`stock-fill ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted">Min: {item.minStock}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryAlerts;
