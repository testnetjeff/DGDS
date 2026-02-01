import React from 'react';
import './Toolbar.css';

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
  setEditMode
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="toolbar-title mono">DISC GOLF DESIGN STUDIO</div>
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
