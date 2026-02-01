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
  is3DGenerated
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
      
      <div className="toolbar-section">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={pdgaMode} 
            onChange={(e) => setPdgaMode(e.target.checked)}
          />
          <span className="checkbox-custom"></span>
          <span className="mono">PDGA COMPLIANCE MODE</span>
        </label>
      </div>
      
      <div className="toolbar-section">
        <button className="action-btn primary" onClick={onGenerate3D}>
          GENERATE 3D MODEL
        </button>
      </div>
      
      {is3DGenerated && (
        <div className="toolbar-section export-section">
          <div className="resolution-group">
            <span className="label mono">RESOLUTION:</span>
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
                  <span className="mono">{res.toUpperCase()}</span>
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
