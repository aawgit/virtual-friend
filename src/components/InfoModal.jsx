import React from 'react';
import { arkitBlendshapes } from '../utils/constants';

const InfoModal = ({ visible, onClose }) => {
  // Generate example array with dummy values
  const generateExampleArray = () => {
    return arkitBlendshapes.map((_, index) => {
      // Create some interesting dummy values for demonstration
      if (index === 8 || index === 9) return 0.3; // eye blinks
      if (index === 24) return 0.2; // jaw open
      if (index === 43 || index === 44) return 0.15; // mouth smile
      if (index < 5) return Math.round(Math.random() * 20) / 100; // brow variations
      return 0.0;
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <div className={`modal ${!visible ? 'hidden' : ''}`}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>ARKit Blendshape Coefficient Order</h2>
        <p>The input array should contain 52 values in the following order:</p>
        
        <div className="blendshape-list">
          {arkitBlendshapes.map((name, index) => (
            <div key={index} className="blendshape-list-item">
              <span className="blendshape-index">[{index}]</span>
              <span className="blendshape-name-modal">{name}</span>
            </div>
          ))}
        </div>
        
        <h3>Example Array Format:</h3>
        <div className="example-array">
          [{generateExampleArray().join(', ')}]
        </div>
        
        <p><strong>Notes:</strong></p>
        <ul>
          <li>Values should be between 0.0 and 1.0</li>
          <li>Array can be in JSON format: <code>[0.1, 0.2, ...]</code></li>
          <li>Values greater than 0.01 will be considered "active"</li>
          <li>The viewer will automatically parse and apply the blendshapes</li>
          <li>Some blendshapes aren't supported in this model. These are shown as disabled sliders. <i>If you have a better model, feel free to share.</i></li>
        </ul>
      </div>
    </div>
  );
};

export default InfoModal;