import React from 'react';

const ModelControls = ({ scale, rotation, onScaleChange, onRotationChange }) => {
  return (
    <div className="model-controls">
      <h4>Model Controls</h4>
      <div className="control-row">
        <label>Scale:</label>
        <input 
          type="range" 
          min="1" 
          max="8" 
          step="0.1" 
          value={scale} 
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
        />
      </div>
      <div className="control-row">
        <label>Rotation:</label>
        <input 
          type="range" 
          min="0" 
          max="6.28" 
          step="0.1" 
          value={rotation} 
          onChange={(e) => onRotationChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};

export default ModelControls;