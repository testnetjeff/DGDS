import React, { useState, useEffect, useCallback, useRef } from 'react';
import LandingPage from './components/LandingPage';
import Canvas2D from './components/Canvas2D';
import Viewer3D from './components/Viewer3D';
import Toolbar from './components/Toolbar';
import ColorPicker from './components/ColorPicker';
import Tutorial from './components/Tutorial';
import CFDPlaceholder from './components/CFDPlaceholder';
import FlightSimulator from './components/FlightSimulator';
import CalculationTerminal from './components/CalculationTerminal';
import LdRevealOverlay from './components/LdRevealOverlay';
import StatusBar from './components/StatusBar';
import { getDefaultDiscProfile } from './utils/bezier';
import { validateProfile } from './utils/pdgaConstraints';
import { createLatheGeometry, downloadSTL } from './utils/geometry';
import { calculateLiftCoefficient } from './utils/thinAirfoil';
import { calculateDragCoefficient } from './utils/dragCoefficient';
import { serializeProject, deserializeProject, downloadProject } from './utils/projectIO';
import './App.css';

function clonePoints(points) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(points) : JSON.parse(JSON.stringify(points));
  } catch (_) {
    return JSON.parse(JSON.stringify(points));
  }
}

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
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
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
  const [showCdTerminal, setShowCdTerminal] = useState(false);
  const [cdCalculationSteps, setCdCalculationSteps] = useState([]);
  const [cdResult, setCdResult] = useState(null);
  const [showLdTerminal, setShowLdTerminal] = useState(false);
  const [ldResult, setLdResult] = useState(null);
  const [ldRevealPhase, setLdRevealPhase] = useState(null);
  const [clAnimationDone, setClAnimationDone] = useState(false);
  const [cdAnimationDone, setCdAnimationDone] = useState(false);
  const isDragInProgressRef = useRef(false);
  const controlPointsRef = useRef(controlPoints);
  controlPointsRef.current = controlPoints;
  const fileInputRef = useRef(null);

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
    if (isDragInProgressRef.current) {
      setControlPoints(newPoints);
      return;
    }
    setUndoStack((prev) => {
      const next = [...prev, clonePoints(controlPoints)];
      return next.length > 50 ? next.slice(-50) : next;
    });
    setRedoStack([]);
    setControlPoints(newPoints);
    setStatusMessage("Profile modified. Aerodynamic potential recalculating...");
  };

  const handleDragStart = useCallback((pointsAtDragStart) => {
    const snapshot = pointsAtDragStart != null ? clonePoints(pointsAtDragStart) : clonePoints(controlPointsRef.current);
    isDragInProgressRef.current = true;
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      return next.length > 50 ? next.slice(-50) : next;
    });
    setRedoStack([]);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragInProgressRef.current = false;
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, clonePoints(controlPoints)]);
    setControlPoints(prev);
    setStatusMessage("Revision restored.");
  }, [undoStack, controlPoints]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, clonePoints(controlPoints)]);
    setControlPoints(next);
    setStatusMessage("Reapply last revision.");
  }, [redoStack, controlPoints]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (activeTab !== '2d') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, handleUndo, handleRedo]);

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
    setUndoStack([]);
    setRedoStack([]);
    setStatusMessage("Profile reset to default. Ready for design input.");
  }, []);

  const handleApplyNaca = useCallback((result) => {
    if (result.error) {
      setStatusMessage(result.error);
      return;
    }
    setControlPoints(result.controlPoints);
    setGeneratedPoints(null);
    setUndoStack([]);
    setRedoStack([]);
    setStatusMessage("NACA profile applied.");
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

  const handleSaveDesign = useCallback(() => {
    const json = serializeProject({ designName, controlPoints, pdgaMode, resolution, discColor });
    const safeName = (designName || 'design').replace(/[^a-zA-Z0-9_-]/g, '_') + '.dgds';
    downloadProject(json, safeName);
    setStatusMessage("Design state archived.");
  }, [designName, controlPoints, pdgaMode, resolution, discColor]);

  const handleLoadDesign = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = deserializeProject(reader.result);
      if (result.error) {
        setStatusMessage(`Load failed: ${result.error}`);
        return;
      }
      setDesignName(result.designName);
      setControlPoints(result.controlPoints);
      setPdgaMode(result.pdgaMode);
      setResolution(result.resolution);
      setDiscColor(result.discColor);
      setGeneratedPoints(null);
      setUndoStack([]);
      setRedoStack([]);
      setStatusMessage("Project loaded. Resume operations.");
    };
    reader.readAsText(file);
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
    if (ldRevealPhase === 'waiting') {
      setLdRevealPhase(null);
      setClAnimationDone(false);
      setCdAnimationDone(false);
    }
    setShowClTerminal(false);
    if (clResult && !clResult.error) {
      setStatusMessage(`Lift coefficient analysis complete. Cₗ = ${clResult.cl.toFixed(4)}`);
    }
  }, [clResult, ldRevealPhase]);

  const handleCalculateCd = useCallback(() => {
    if (showCdTerminal) {
      setShowCdTerminal(false);
      return;
    }
    setStatusMessage("Initiating approximate drag analysis...");
    const result = calculateDragCoefficient(controlPoints, 25);
    setCdCalculationSteps(result.steps);
    setCdResult(result);
    setShowCdTerminal(true);
  }, [controlPoints, showCdTerminal]);

  const handleCloseCdTerminal = useCallback(() => {
    if (ldRevealPhase === 'waiting') {
      setLdRevealPhase(null);
      setClAnimationDone(false);
      setCdAnimationDone(false);
    }
    setShowCdTerminal(false);
    if (cdResult && !cdResult.error) {
      setStatusMessage(`Drag coefficient analysis complete. Cd = ${cdResult.cd.toFixed(4)}`);
    }
  }, [cdResult, ldRevealPhase]);

  const handleCalculateLd = useCallback(() => {
    if (showLdTerminal || ldRevealPhase !== null) {
      setShowLdTerminal(false);
      setLdRevealPhase(null);
      setClAnimationDone(false);
      setCdAnimationDone(false);
      return;
    }
    setStatusMessage("L/D analysis: computing Cₗ and Cd...");
    const clRes = calculateLiftCoefficient(controlPoints, 0);
    const cdRes = calculateDragCoefficient(controlPoints, 25);
    setClCalculationSteps(clRes.steps);
    setClResult(clRes);
    setCdCalculationSteps(cdRes.steps);
    setCdResult(cdRes);
    const cl = clRes.error ? null : clRes.cl;
    const cd = cdRes.error ? null : cdRes.cd;
    const ld = cd != null && cd !== 0 ? (cl != null ? cl / cd : null) : null;
    setLdResult({ cl, cd, ld });
    setShowClTerminal(true);
    setShowCdTerminal(true);
    setLdRevealPhase('waiting');
    setClAnimationDone(clRes.steps?.length === 0);
    setCdAnimationDone(cdRes.steps?.length === 0);
    setStatusMessage("L/D analysis: Cₗ and Cd computed.");
  }, [controlPoints, showLdTerminal, ldRevealPhase]);

  const handleCloseLdTerminal = useCallback(() => {
    setShowLdTerminal(false);
    setLdRevealPhase(null);
    setLdResult(null);
  }, []);

  const handleClAnimationComplete = useCallback(() => {
    setClAnimationDone(true);
  }, []);

  const handleCdAnimationComplete = useCallback(() => {
    setCdAnimationDone(true);
  }, []);

  useEffect(() => {
    if (ldRevealPhase !== 'waiting' || !clAnimationDone || !cdAnimationDone) return;
    setLdRevealPhase('drawing');
  }, [ldRevealPhase, clAnimationDone, cdAnimationDone]);

  const handleRevealComplete = useCallback(() => {
    setLdRevealPhase('show');
    setShowLdTerminal(true);
  }, []);

  if (!appStarted) {
    return <LandingPage onEnter={handleAppStart} />;
  }

  return (
    <div className="app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".dgds,.json"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />
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
        onSaveDesign={handleSaveDesign}
        onLoadDesign={handleLoadDesign}
        designName={designName}
        setDesignName={setDesignName}
        onCalculateCl={handleCalculateCl}
        isCalculatingCl={showClTerminal}
        onCalculateCd={handleCalculateCd}
        isCalculatingCd={showCdTerminal}
        onCalculateLd={handleCalculateLd}
        isCalculatingLd={showLdTerminal}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onApplyNaca={handleApplyNaca}
      />

      <CalculationTerminal
        isOpen={showClTerminal}
        onClose={handleCloseClTerminal}
        calculationSteps={clCalculationSteps}
        finalResult={clResult}
        positionSlot={ldRevealPhase !== null ? 0 : undefined}
        onAnimationComplete={ldRevealPhase === 'waiting' ? handleClAnimationComplete : undefined}
      />

      <CalculationTerminal
        isOpen={showCdTerminal}
        onClose={handleCloseCdTerminal}
        calculationSteps={cdCalculationSteps}
        finalResult={cdResult}
        variant="cd"
        positionSlot={ldRevealPhase !== null ? 1 : undefined}
        onAnimationComplete={ldRevealPhase === 'waiting' ? handleCdAnimationComplete : undefined}
      />

      {ldRevealPhase === 'drawing' && (
        <LdRevealOverlay onRevealComplete={handleRevealComplete} />
      )}

      {ldRevealPhase === 'show' && showLdTerminal && (
        <CalculationTerminal
          isOpen={showLdTerminal}
          onClose={handleCloseLdTerminal}
          calculationSteps={[]}
          finalResult={ldResult}
          variant="ld"
          positionSlot={2}
        />
      )}

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
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
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
