import React, { useState, useEffect, useCallback } from 'react';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import Toolbar from './components/Toolbar';
import ColorPicker from './components/ColorPicker';
import Tutorial from './components/Tutorial';
import CFDPlaceholder from './components/CFDPlaceholder';
import StatusBar from './components/StatusBar';
import { getDefaultDiscProfile } from './utils/bezier';
import { validateProfile } from './utils/pdgaConstraints';
import { createLatheGeometry, downloadSTL } from './utils/geometry';
import './App.css';

const TARS_MESSAGES = [
  "Systems nominal. Ready for design input.",
  "Profile modified. Aerodynamic potential recalculating...",
  "PDGA Compliance engaged. Physics violations are currently prohibited.",
  "3D mesh generated. Visual inspection recommended.",
  "STL export complete. Manufacturing readiness confirmed.",
  "Design parameters within acceptable tolerances.",
];

export default function App() {
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeTab, setActiveTab] = useState('2d');
  const [pdgaMode, setPdgaMode] = useState(false);
  const [controlPoints, setControlPoints] = useState(getDefaultDiscProfile());
  const [generatedPoints, setGeneratedPoints] = useState(null);
  const [discColor, setDiscColor] = useState('hsl(200, 100%, 50%)');
  const [resolution, setResolution] = useState('medium');
  const [statusMessage, setStatusMessage] = useState(TARS_MESSAGES[0]);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    const storedTutorial = localStorage.getItem('dgds_tutorial_shown');
    if (storedTutorial === 'true') {
      setShowTutorial(false);
    }
  }, []);

  useEffect(() => {
    if (pdgaMode) {
      const newWarnings = validateProfile(controlPoints);
      setWarnings(newWarnings);
      if (newWarnings.length === 0) {
        setStatusMessage("PDGA Compliance engaged. Physics violations are currently prohibited.");
      }
    } else {
      setWarnings([]);
    }
  }, [controlPoints, pdgaMode]);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('dgds_tutorial_shown', 'true');
  };

  const handleGenerate3D = useCallback(() => {
    setGeneratedPoints([...controlPoints]);
    setActiveTab('3d');
    setStatusMessage("3D mesh generated. Visual inspection recommended.");
  }, [controlPoints]);

  const handleExport = useCallback(() => {
    if (!generatedPoints) return;
    
    try {
      const geometry = createLatheGeometry(generatedPoints, 64, resolution);
      downloadSTL(geometry, `disc_design_${resolution}.stl`);
      setStatusMessage("STL export complete. Manufacturing readiness confirmed.");
    } catch (e) {
      console.error('Export error:', e);
      setStatusMessage("Export failed. Geometry recalculation required.");
    }
  }, [generatedPoints, resolution]);

  const handlePdgaModeChange = (enabled) => {
    setPdgaMode(enabled);
    if (enabled) {
      setStatusMessage("PDGA Compliance engaged. Physics violations are currently prohibited.");
    } else {
      setStatusMessage("PDGA Compliance disabled. Design freedom restored.");
    }
  };

  const handlePointsChange = (newPoints) => {
    setControlPoints(newPoints);
    setStatusMessage("Profile modified. Aerodynamic potential recalculating...");
  };

  return (
    <div className="app">
      {showTutorial && <Tutorial onClose={handleCloseTutorial} />}
      
      <Toolbar
        pdgaMode={pdgaMode}
        setPdgaMode={handlePdgaModeChange}
        onGenerate3D={handleGenerate3D}
        onExport={handleExport}
        resolution={resolution}
        setResolution={setResolution}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        is3DGenerated={generatedPoints !== null}
      />

      <main className="workspace">
        {activeTab === '2d' && (
          <div className="canvas-container">
            <Canvas2D
              controlPoints={controlPoints}
              setControlPoints={handlePointsChange}
              pdgaMode={pdgaMode}
            />
          </div>
        )}

        {activeTab === '3d' && (
          <div className="viewer-container">
            {generatedPoints ? (
              <>
                <Viewer3D
                  controlPoints={generatedPoints}
                  color={discColor}
                  resolution={resolution}
                />
                <ColorPicker color={discColor} setColor={setDiscColor} />
              </>
            ) : (
              <div className="no-model-message">
                <span className="mono">NO MODEL GENERATED</span>
                <p>Return to Drafting Table and click "Generate 3D Model"</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cfd' && (
          <CFDPlaceholder />
        )}
      </main>

      <StatusBar
        message={statusMessage}
        pdgaMode={pdgaMode}
        warnings={warnings}
      />
    </div>
  );
}
