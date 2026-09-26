import React, { useState } from 'react';
import { IconLayoutGrid, IconPencil } from '@tabler/icons-react';
import { useCan, useCurrentLocation } from '@/hooks';
import { FloorPlanView } from './FloorPlanView';
import { FloorPlanEditor } from './FloorPlanEditor';
import { PageHeader, Segmented, Empty } from '../shared/ui';

const TableManagementPage: React.FC = () => {
  const location = useCurrentLocation();
  const can = useCan();
  const [mode, setMode] = useState<'live' | 'editor'>('live');

  if (!location) return <div className="page-container"><Empty title="No location selected" hint="Pick a location from the top bar." /></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <PageHeader
        title="Floor & Tables"
        subtitle={`${location.name} · live status refreshes every 10s`}
        actions={can('tables.layout') && (
          <Segmented value={mode} onChange={setMode} options={[
            { value: 'live', label: <><IconLayoutGrid size={12} /> Live floor</> },
            { value: 'editor', label: <><IconPencil size={12} /> Floor editor</> },
          ]} />
        )}
      />
      <div className="card card-flush" style={{ flex: 1, minHeight: 0 }}>
        {mode === 'live' ? <FloorPlanView locationId={location.id} /> : <FloorPlanEditor locationId={location.id} />}
      </div>
    </div>
  );
};

export default TableManagementPage;
