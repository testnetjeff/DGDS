import React, { useState } from 'react';
import './Toolbar.css';
import { nacaToControlPoints } from '../utils/naca';

export default function Toolbar({ 
  pdgaMode, 
  setPdgaMode, 
  onGenerate3D, 
  onExport,
  resolution,
  setResolution,
  activeTab,
  setActiveTab,
  is3DGenerated,
  editMode,
  setEditMode,
  onBack,
  onReset,
  onCopyProfile,
  onResetView,
  onSaveDesign,
  onLoadDesign,
  designName,
  setDesignName,
  onCalculateCl,
  isCalculatingCl,
  onCalculateCd,
  isCalculatingCd,
  onCalculateLd,
  isCalculatingLd,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onApplyNaca,
  discTemplate,
  onLoadTemplate
}) {
  const [nacaInput, setNacaInput] = useState('');

  const handleNacaApply = () => {
    const result = nacaToControlPoints(nacaInput.trim());
    onApplyNaca(result);
  };

  const handleNacaKeyDown = (e) => {
    if (e.key === 'Enter') handleNacaApply();
  };
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button className="back-btn" onClick={onBack} title="Return to start">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
        <div className="toolbar-title mono">DISC GOLF DESIGN STUDIO</div>
      </div>

      <div className="toolbar-section design-name-section">
        <span className="label mono">NAME:</span>
        <input
          type="text"
          className="design-name-input mono"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          placeholder="Enter design name"
          maxLength={50}
        />
      </div>

      <div className="toolbar-section">
        <button 
          className="action-btn save-load"
          onClick={onSaveDesign}
          title="Save design to file"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>SAVE</span>
        </button>
        <button 
          className="action-btn save-load"
          onClick={onLoadDesign}
          title="Load design from file"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>LOAD</span>
        </button>
      </div>
      
      <div className="toolbar-tabs">
        <button 
          className={`tab-btn ${activeTab === '2d' ? 'active' : ''}`}
          onClick={() => setActiveTab('2d')}
        >
          DRAFTING TABLE
        </button>
        <button 
          className={`tab-btn ${activeTab === '3d' ? 'active' : ''}`}
          onClick={() => setActiveTab('3d')}
        >
          INSPECTION DECK
        </button>
        <button 
          className={`tab-btn ${activeTab === 'flight' ? 'active' : ''}`}
          onClick={() => setActiveTab('flight')}
        >
          FLIGHT SIM
        </button>
        <button 
          className={`tab-btn ${activeTab === 'cfd' ? 'active' : ''}`}
          onClick={() => setActiveTab('cfd')}
        >
          CFD ANALYSIS
        </button>
      </div>
      
      {activeTab === '2d' && (
        <div className="toolbar-section edit-tools">
          <span className="label mono">TOOLS:</span>
          <div className="edit-mode-buttons">
            <button 
              className={`tool-btn ${editMode === 'select' ? 'active' : ''}`}
              onClick={() => setEditMode('select')}
              title="Select and drag points"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 1l6 14 2-6 6-2L1 1z"/>
              </svg>
            </button>
            <button 
              className={`tool-btn add ${editMode === 'add' ? 'active' : ''}`}
              onClick={() => setEditMode('add')}
              title="Add new anchor point"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
            <button 
              className={`tool-btn delete ${editMode === 'delete' ? 'active' : ''}`}
              onClick={() => setEditMode('delete')}
              title="Delete anchor point"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 8h12" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
          </div>
          <button 
            className="tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6"/>
              <path d="M3 13a9 9 0 1 0 3-7.7L3 13"/>
            </svg>
          </button>
          <button 
            className="tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6"/>
              <path d="M21 13a9 9 0 1 1-3-7.7L21 13"/>
            </svg>
          </button>
          <button 
            className="tool-btn reset"
            onClick={onReset}
            title="Reset to default profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          <button 
            className="tool-btn copy"
            onClick={onCopyProfile}
            title="Copy profile coordinates"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
          <button 
            className="tool-btn reset-view"
            onClick={onResetView}
            title="Reset view to center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
          </button>
          <span className="label mono">Template:</span>
          <select
            className="template-select mono"
            value={discTemplate}
            onChange={(e) => onLoadTemplate(e.target.value)}
            title="Load disc type template"
          >
            <option value="putter">Putter</option>
            <option value="mid">Mid-Range</option>
            <option value="driver">Driver</option>
          </select>
        </div>
      )}

      {activeTab === '2d' && (
        <div className="toolbar-section naca-section">
          <span className="label mono">NACA:</span>
          <input
            type="text"
            className="naca-input mono"
            value={nacaInput}
            onChange={(e) => setNacaInput(e.target.value)}
            onKeyDown={handleNacaKeyDown}
            placeholder="e.g. 0012, 2412, 23012"
            maxLength={12}
            title="4- or 5-digit NACA code (e.g. 0012, 2412, 23012). Reflex 5-digit not supported."
          />
          <button
            type="button"
            className="action-btn naca-apply"
            onClick={handleNacaApply}
            title="Generate airfoil from NACA code"
          >
            APPLY
          </button>
        </div>
      )}
      
      <div className="toolbar-section">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={pdgaMode} 
            onChange={(e) => setPdgaMode(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span className="mono">PDGA COMPLIANCE</span>
        </label>
      </div>

      <div className="toolbar-section">
        <button 
          className={`action-btn calculate-cl ${isCalculatingCl ? 'active' : ''}`}
          onClick={onCalculateCl}
          title="Calculate lift coefficient using thin airfoil theory"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span>CALC Cₗ</span>
        </button>
        <button 
          className={`action-btn calculate-cd ${isCalculatingCd ? 'active' : ''}`}
          onClick={onCalculateCd}
          title="Approximate drag coefficient (smooth surface, typical Re)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>CALC Cd</span>
        </button>
        <button 
          className={`action-btn calculate-ld ${isCalculatingLd ? 'active' : ''}`}
          onClick={onCalculateLd}
          title="Compute Cₗ and Cd, then display lift-to-drag ratio"
        >
          <span>CALC L/D</span>
        </button>
      </div>
      
      <div className="toolbar-section">
        <button className="action-btn primary" onClick={onGenerate3D}>
          GENERATE 3D
        </button>
      </div>
      
      {is3DGenerated && (
        <div className="toolbar-section export-section">
          <div className="resolution-group">
            <span className="label mono">RES:</span>
            <div className="resolution-options">
              {['low', 'medium', 'high'].map(res => (
                <label key={res} className="radio-label">
                  <input 
                    type="radio" 
                    name="resolution" 
                    value={res}
                    checked={resolution === res}
                    onChange={() => setResolution(res)}
                  />
                  <span className="radio-custom"></span>
                  <span className="mono">{res.charAt(0).toUpperCase()}</span>
                </label>
              ))}
              <span className="help-icon" title="Low: ~5k polygons, small file. Medium: ~20k polygons, balanced. High: ~80k polygons, maximum detail.">?</span>
            </div>
          </div>
          <button className="action-btn secondary" onClick={onExport}>
            EXPORT .STL
          </button>
        </div>
      )}
    </div>
  );
}
