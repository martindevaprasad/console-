import React, { useState } from 'react';
import { useAuth, useCurrentLocation } from '@/hooks';
import { FloorPlanView } from './FloorPlanView';
import { FloorPlanEditor } from './FloorPlanEditor';
import { IconLayoutGrid, IconPencil } from '@tabler/icons-react';

type Tab = 'live' | 'editor';

const TableManagementPage: React.FC = () => {
  const { user } = useAuth();
  const currentLocation = useCurrentLocation();

  // Use user's assigned location, or fall back to the currently selected location
  const locationId = user?.locationId || currentLocation?.id || '';
  const [activeTab, setActiveTab] = useState<Tab>('live');

  if (!locationId) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <IconLayoutGrid size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-secondary)' }}>No location selected</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Please select a location from the settings or contact your manager to assign you to one.
          </p>
        </div>
      </div>
    );
  }

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Table Management</h1>
          <p className="page-subtitle">Live floor plan · Seating · Checkout</p>
        </div>

        {/* Tab Switch */}
        {isManager && (
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--color-bg-secondary)',
            borderRadius: '10px', padding: '4px',
            border: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => setActiveTab('live')}
              className={activeTab === 'live' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconLayoutGrid size={15} /> Live View
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={activeTab === 'editor' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPencil size={15} /> Floor Editor
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: 'hidden',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-primary)',
      }}>
        {activeTab === 'live' ? (
          <FloorPlanView locationId={locationId} />
        ) : (
          <FloorPlanEditor locationId={locationId} />
        )}
      </div>
    </div>
  );
};

export default TableManagementPage;
