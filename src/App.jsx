import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import Toolbar from './components/Toolbar';
import ColorPicker from './components/ColorPicker';
import Tutorial from './components/Tutorial';
import CFDPlaceholder from './components/CFDPlaceholder';
import FlightSimulator from './components/FlightSimulator';
import CalculationTerminal from './components/CalculationTerminal';
import StatusBar from './components/StatusBar';
import { getDefaultDiscProfile } from './utils/bezier';
import { validateProfile } from './utils/pdgaConstraints';
import { createLatheGeometry, downloadSTL } from './utils/geometry';
import { calculateLiftCoefficient } from './utils/thinAirfoil';
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
  const [appStarted, setAppStarted] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [activeTab, setActiveTab] = useState('2d');
  const [pdgaMode, setPdgaMode] = useState(false);
  const [controlPoints, setControlPoints] = useState(getDefaultDiscProfile());
  const [generatedPoints, setGeneratedPoints] = useState(null);
  const [discColor, setDiscColor] = useState('hsl(200, 100%, 50%)');
  const [resolution, setResolution] = useState('medium');
  const [statusMessage, setStatusMessage] = useState(TARS_MESSAGES[0]);
  const [warnings, setWarnings] = useState([]);
  const [editMode, setEditMode] = useState('select');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [designName, setDesignName] = useState('Untitled Disc');
  const [showClTerminal, setShowClTerminal] = useState(false);
  const [clCalculationSteps, setClCalculationSteps] = useState([]);
  const [clResult, setClResult] = useState(null);

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
      const geometry = createLatheGeometry(generatedPoints, 64, resolution, true);
      const safeName = designName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'disc_design';
      downloadSTL(geometry, `${safeName}.stl`);
      setStatusMessage("STL export complete. Manufacturing readiness confirmed.");
    } catch (e) {
      console.error('Export error:', e);
      setStatusMessage("Export failed. Geometry recalculation required.");
    }
  }, [generatedPoints, resolution, designName]);

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

  const handleEditModeChange = (mode) => {
    setEditMode(mode);
    if (mode === 'add') {
      setStatusMessage("Add mode active. Click on canvas to place anchor point.");
    } else if (mode === 'delete') {
      setStatusMessage("Delete mode active. Click anchor point to remove.");
    } else {
      setStatusMessage("Select mode active. Drag points to modify profile.");
    }
  };

  const handleAppStart = useCallback(() => {
    setAppStarted(true);
  }, []);

  const handleBack = useCallback(() => {
    setAppStarted(false);
  }, []);

  const handleReset = useCallback(() => {
    setControlPoints(getDefaultDiscProfile());
    setGeneratedPoints(null);
    setStatusMessage("Profile reset to default. Ready for design input.");
  }, []);

  const handleCopyProfile = useCallback(() => {
    const profileJson = JSON.stringify(controlPoints, null, 2);
    navigator.clipboard.writeText(profileJson).then(() => {
      setStatusMessage("Profile coordinates copied to clipboard.");
    }).catch(() => {
      console.log(profileJson);
      setStatusMessage("Profile logged to console. Check browser dev tools.");
    });
  }, [controlPoints]);

  const handleResetView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setStatusMessage("View reset to origin.");
  }, []);

  const handleCalculateCl = useCallback(() => {
    if (showClTerminal) {
      setShowClTerminal(false);
      return;
    }
    setStatusMessage("Initiating thin airfoil analysis...");
    const result = calculateLiftCoefficient(controlPoints, 0);
    setClCalculationSteps(result.steps);
    setClResult(result);
    setShowClTerminal(true);
  }, [controlPoints, showClTerminal]);

  const handleCloseClTerminal = useCallback(() => {
    setShowClTerminal(false);
    if (clResult && !clResult.error) {
      setStatusMessage(`Lift coefficient analysis complete. Cₗ = ${clResult.cl.toFixed(4)}`);
    }
  }, [clResult]);

  if (!appStarted) {
    return <LandingPage onEnter={handleAppStart} />;
  }

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
        editMode={editMode}
        setEditMode={handleEditModeChange}
        onBack={handleBack}
        onReset={handleReset}
        onCopyProfile={handleCopyProfile}
        onResetView={handleResetView}
        designName={designName}
        setDesignName={setDesignName}
        onCalculateCl={handleCalculateCl}
        isCalculatingCl={showClTerminal}
      />

      <CalculationTerminal
        isOpen={showClTerminal}
        onClose={handleCloseClTerminal}
        calculationSteps={clCalculationSteps}
        finalResult={clResult}
      />

      <main className="workspace">
        {activeTab === '2d' && (
          <div className="canvas-container">
            <Canvas2D
              controlPoints={controlPoints}
              setControlPoints={handlePointsChange}
              pdgaMode={pdgaMode}
              editMode={editMode}
              setStatusMessage={setStatusMessage}
              panOffset={panOffset}
              setPanOffset={setPanOffset}
              zoom={zoom}
              setZoom={setZoom}
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

        {activeTab === 'flight' && (
          <div className="simulator-container">
            <FlightSimulator 
              controlPoints={controlPoints}
              setStatusMessage={setStatusMessage}
            />
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
