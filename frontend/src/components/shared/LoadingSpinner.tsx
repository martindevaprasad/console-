import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text, fullPage }) => {
  const spinnerClass = `spinner${size === 'lg' ? ' spinner-lg' : ''}`;

  if (fullPage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className={spinnerClass} />
        {text && <p className="text-secondary">{text}</p>}
      </div>
    );
  }

  return (
    <div className="loading-overlay">
      <div className={spinnerClass} />
      {text && <p className="text-secondary">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
