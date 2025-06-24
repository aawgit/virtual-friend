import React from 'react';

const StatsDisplay = ({ values, visible = false }) => {
  if (!visible || !values || !values.length) {
    return null;
  }

  const totalValues = values.length;
  const activeValues = values.filter(v => Math.abs(v) > 0.01);
  const maxValue = Math.max(...values.map(Math.abs));

  return (
    <div className="stats">
      <div className="stat-item">
        <div className="stat-value">{totalValues}</div>
        <div className="stat-label">Total Values</div>
      </div>
      <div className="stat-item">
        <div className="stat-value">{activeValues.length}</div>
        <div className="stat-label">Active Blendshapes</div>
      </div>
      <div className="stat-item">
        <div className="stat-value">{maxValue.toFixed(3)}</div>
        <div className="stat-label">Max Value</div>
      </div>
    </div>
  );
};

export default StatsDisplay;