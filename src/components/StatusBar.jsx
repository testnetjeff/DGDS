import React from 'react';
import './StatusBar.css';

export default function StatusBar({ message, pdgaMode, warnings }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-message mono">{message}</span>
      </div>
      <div className="status-right">
        {warnings.length > 0 && (
          <span className="status-warning mono">
            {warnings[0]}
          </span>
        )}
        <span className={`pdga-status mono ${pdgaMode ? 'active' : ''}`}>
          PDGA: {pdgaMode ? 'ENGAGED' : 'DISABLED'}
        </span>
      </div>
    </div>
  );
}
