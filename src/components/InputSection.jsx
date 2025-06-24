import React, { useState } from 'react';

const InputSection = ({ onDataParse, onInfoClick }) => {
  const [inputData, setInputData] = useState('');

  const handleParse = () => {
    if (!inputData) {
      alert('Please paste your blendshape array');
      return;
    }

    try {
      let values;
      if (inputData.startsWith('[') && inputData.endsWith(']')) {
        values = JSON.parse(inputData);
      } else {
        values = inputData.split(',').map(v => parseFloat(v.trim()));
      }

      if (!Array.isArray(values)) {
        throw new Error('Invalid array format');
      }

      console.log('Parsed input data:', values);
      onDataParse(values);
    } catch (error) {
      console.error('Error parsing data:', error);
      alert('Error parsing data: ' + error.message);
    }
  };

  return (
    <div className="input-section">
      <div className="input-header">
        <h3>Paste your blendshapes array:</h3>
        <button className="info-button" onClick={onInfoClick} title="Show coefficient order">?</button>
      </div>
      <textarea 
        value={inputData}
        onChange={(e) => setInputData(e.target.value)}
        placeholder="[0.0, 0.0, 0.0, ...]"
      ></textarea>
      <button onClick={handleParse}>Parse & Apply Blendshapes</button>
    </div>
  );
};

export default InputSection;