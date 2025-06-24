import { useState, useEffect } from 'react';
import { arkitBlendshapeOrder, blendshapeNameMap } from '../utils/constants';

const BlendshapeSliders = ({ 
  blendshapeValues, 
  onBlendshapeChange, 
  morphMeshes 
}) => {
  const [sliders, setSliders] = useState([]);

  useEffect(() => {
    if (!morphMeshes || morphMeshes.length === 0) return;

    const mesh = morphMeshes[0]; // Use the first mesh with morph targets
    const dict = mesh.morphTargetDictionary || {};
    
    // Reverse lookup: ARKit name -> modelName
    const modelNameByArkit = {};
    for (const [modelName, index] of Object.entries(dict)) {
      const arkitName = blendshapeNameMap[modelName];
      if (arkitName) {
        modelNameByArkit[arkitName] = { modelName, index };
      }
    }

    // Create sliders data in fixed order
    const slidersData = arkitBlendshapeOrder.map((arkitName, i) => {
      const mapping = modelNameByArkit[arkitName];
      return {
        id: i,
        arkitName,
        value: blendshapeValues[i] || 0,
        disabled: !mapping,
        mapping
      };
    });

    setSliders(slidersData);
  }, [morphMeshes, blendshapeValues]);

  const handleSliderChange = (index, value) => {
    const newValue = parseFloat(value);
    const newValues = [...blendshapeValues];
    newValues[index] = newValue;
    onBlendshapeChange(newValues);
  };

  if (sliders.length === 0) {
    return <div>Loading sliders...</div>;
  }

  return (
    <div className="blendshapes-panel">
      <h3>ARKit Blendshapes</h3>
      <div id="sliderContainer">
        {sliders.map((slider) => (
          <div 
            key={slider.id} 
            className={`slider-group ${Math.abs(slider.value) > 0.01 ? 'active' : ''}`}
          >
            <label>{slider.id} {slider.arkitName}</label>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={slider.value}
                disabled={slider.disabled}
                onChange={(e) => handleSliderChange(slider.id, e.target.value)}
              />
              <span className="slider-value">{slider.value.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlendshapeSliders;