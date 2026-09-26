import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMultiTenantContext } from '@/hooks';
import { api, ANALYTICS, ORDER, INVENTORY } from '@/services/api';
import MetricCard from './MetricCard';
import SalesChart from './SalesChart';
import RecentOrders from './RecentOrders';
import InventoryAlerts from './InventoryAlerts';
import LoadingSpinner from '../shared/LoadingSpinner';
import {
  IconCoin,
  IconReceipt,
  IconTrendingUp,
  IconTags,
  IconAlertTriangle,
} from '@tabler/icons-react';

export const Dashboard: React.FC = () => {
  const { organizationId, locationId, token } = useMultiTenantContext();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsRes, chartRes, ordersRes, stockRes] = await Promise.all([
          api.query(ANALYTICS.DASHBOARD, { organizationId, locationId: locationId || null }, token),
          api.query(ANALYTICS.REVENUE_CHART, { organizationId, locationId: locationId || null, days: 7 }, token),
          api.query(ORDER.LIST, { organizationId, locationId: locationId || null, limit: 5 }, token),
          api.query(INVENTORY.LOW_STOCK, { organizationId, locationId: locationId || null }, token),
        ]);

        setMetrics(metricsRes.dashboardMetrics);
        setChartData(chartRes.revenueChart);
        setRecentOrders(ordersRes.orders);
        setLowStock(stockRes.lowStockProducts);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, locationId, token]);

  if (loading) {
    return <LoadingSpinner text="Retrieving live operations metrics..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Analytics Center</h1>
        <p className="page-subtitle">Real-time performance indicators and operational updates</p>
      </div>

      {metrics && (
        <div className="metrics-grid">
          <MetricCard
            title="Today's Revenue"
            value={`$${metrics.todayRevenue.toFixed(2)}`}
            icon={<IconCoin size={20} />}
            type="primary"
            change="12.5% vs yesterday"
            isUp={true}
          />
          <MetricCard
            title="Today's Orders"
            value={metrics.todayOrders}
            icon={<IconReceipt size={20} />}
            type="success"
            change="4.2% vs yesterday"
            isUp={true}
          />
          <MetricCard
            title="Average Order Value"
            value={`$${metrics.avgOrderValue.toFixed(2)}`}
            icon={<IconTrendingUp size={20} />}
            type="info"
          />
          <MetricCard
            title="Active Products"
            value={metrics.activeProducts}
            icon={<IconTags size={20} />}
            type="warning"
          />
          <MetricCard
            title="Low Stock Items"
            value={metrics.lowStockCount}
            icon={<IconAlertTriangle size={20} />}
            type={metrics.lowStockCount > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <SalesChart data={chartData} />
        </div>
        <div>
          <InventoryAlerts alerts={lowStock} />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <RecentOrders orders={recentOrders} />
      </div>
    </div>
  );
};

export default Dashboard;
