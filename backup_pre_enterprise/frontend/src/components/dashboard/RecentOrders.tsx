import React from 'react';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  user?: { name: string };
}

interface RecentOrdersProps {
  orders: Order[];
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
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

  if (!orders || orders.length === 0) {
    return (
      <div className="glass-card-static p-6" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center text-muted">No orders processed yet today.</div>
      </div>
    );
  }

  return (
    <div className="glass-card-static" style={{ overflow: 'hidden' }}>
      <div className="p-5" style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <h3 className="chart-title">Recent Transactions</h3>
      </div>
      <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date/Time</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const date = new Date(order.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const itemsSummary = order.items
                .map((item) => `${item.product?.name || 'Product'} x${item.quantity}`)
                .join(', ');

              return (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                  <td>{date}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {itemsSummary}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-accent-light)' }}>
                    ${order.total.toFixed(2)}
                  </td>
                  <td>{statusBadge(order.status)}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                      {order.paymentMethod}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;
