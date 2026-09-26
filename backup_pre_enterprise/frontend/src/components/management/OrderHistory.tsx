import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext } from '@/hooks';
import { api, ORDER } from '@/services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

export const OrderHistory: React.FC = () => {
  const { organizationId, locationId, token } = useMultiTenantContext();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await api.query(ORDER.LIST, { organizationId, locationId: locationId || null }, token);
        setOrders(data.orders);
      } catch (err: any) {
        toast.error(err.message || 'Failed to retrieve transaction log');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [organizationId, locationId, token]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-success">Completed</span>;
      case 'PENDING':
        return <span className="badge badge-warning">Pending</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner text="Connecting operations logs..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Operations Log</h1>
        <p className="page-subtitle">Transaction audit records and checkout settlement logs</p>
      </div>

      <div className="glass-card-static" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Time & Date</th>
                <th>Staff Member</th>
                <th>Store Location</th>
                <th>Items Purchased</th>
                <th>Settlement Method</th>
                <th>AOV Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const date = new Date(order.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const itemsSummary = order.items
                  .map((item: any) => `${item.product?.name || 'Product'} (x${item.quantity})`)
                  .join(', ');

                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                    <td>{date}</td>
                    <td>{order.user?.name || <span className="text-muted">Register Term</span>}</td>
                    <td>{order.location?.name}</td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {itemsSummary}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-accent-light)' }}>
                      ${order.total.toFixed(2)}
                    </td>
                    <td>{statusBadge(order.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
