import { useState, useEffect } from 'react';
import './index.css';
import ThreeJSViewer from './components/ThreeJSViewer';
import BlendshapeSliders from './components/BlendshapeSliders';
import ModelControls from './components/ModelControls';
import InputSection from './components/InputSection';
import StatsDisplay from './components/StatsDisplay';
import InfoModal from './components/InfoModal';

function App() {
  const [blendshapeValues, setBlendshapeValues] = useState(new Array(52).fill(0));
  const [morphMeshes, setMorphMeshes] = useState([]);
  const [modelScale, setModelScale] = useState(4);
  const [modelRotation, setModelRotation] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Load example data on mount
  useEffect(() => {
    const exampleData = `[0.0, 0.0, 0.0, 0.0, 0.0, 0.026174580678343773, 0.594277560710907, 0.0, 0.0, 0.0, 0.0, 0.0, 0.026059681549668312, 0.5944592952728271, 0.023094596341252327, 0.0006808243924751878, 0.024826038628816605, 0.046770986169576645, 0.0009422543807886541, 0.06569699943065643, 0.00044532548054121435, 0.019521566107869148, -3.756374280783348e-05, 0.12610526382923126, 0.09840516000986099, -0.00028435199055820704, 0.0003598964831326157, 0.03203817084431648, 0.02757873758673668, 0.11394623667001724, 0.11269740760326385, 0.006579927634447813, 0.009613755159080029, 0.00030736744520254433, 0.0003520186000969261, 6.487023347290233e-05, 0.0011935947695747018, 0.23282714188098907, 0.22038716077804565, 0.04937620460987091, 0.043106041848659515, -0.00029014566098339856, -0.0003475777921266854, 0.2671084403991699, 0.134125217795372, 0.13437339663505554, 0.00018445044406689703, 0.04482872411608696, 0.04833042994141579, 0.000261367968050763, -0.00020279570890124887, 0.0]`;
    try {
      const values = JSON.parse(exampleData);
      console.log('Setting example blendshape values:', values);
      setBlendshapeValues(values);
      setStatsVisible(true);
    } catch (error) {
      console.error('Error parsing example data:', error);
    }
  }, []);

  const handleDataParse = (values) => {
    setBlendshapeValues(values);
    setStatsVisible(true);
  };

  const handleBlendshapeChange = (newValues) => {
    setBlendshapeValues(newValues);
  };

  const handleMeshesLoaded = (meshes) => {
    setMorphMeshes(meshes);
  };

  const toggleInfoModal = () => {
    setInfoModalVisible(!infoModalVisible);
  };

  return (
    <div className="container">
      <h1>Blendshape Parser & Visualizer</h1>
      
      <InputSection 
        onDataParse={handleDataParse} 
        onInfoClick={toggleInfoModal} 
      />
      
      <StatsDisplay 
        values={blendshapeValues} 
        visible={statsVisible} 
      />
      
      <div className="main-content">
        <ThreeJSViewer 
          blendshapeValues={blendshapeValues}
          modelScale={modelScale}
          modelRotation={modelRotation}
          onMeshesLoaded={handleMeshesLoaded}
        />
        
        <div className="controls-section">
          <ModelControls 
            scale={modelScale}
            rotation={modelRotation}
            onScaleChange={setModelScale}
            onRotationChange={setModelRotation}
          />
          
          <BlendshapeSliders 
            blendshapeValues={blendshapeValues}
            onBlendshapeChange={handleBlendshapeChange}
            morphMeshes={morphMeshes}
          />
        </div>
      </div>
      
      <InfoModal 
        visible={infoModalVisible} 
        onClose={toggleInfoModal} 
      />
    </div>
  );
}

export default App;