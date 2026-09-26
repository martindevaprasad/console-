import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  change?: string;
  isUp?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  type = 'primary',
  change,
  isUp = true,
}) => {
  const iconColorMap = {
    primary: 'purple',
    success: 'green',
    warning: 'amber',
    danger: 'red',
    info: 'blue',
  };

  return (
    <div className={`metric-card ${type}`}>
      <div className={`metric-icon ${iconColorMap[type]}`}>
        <span>{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{title}</div>
      {change && (
        <div className={`metric-change ${isUp ? 'up' : 'down'}`}>
          {isUp ? '▲' : '▼'} {change}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
