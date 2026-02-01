import React from 'react';
import './CFDPlaceholder.css';

export default function CFDPlaceholder() {
  return (
    <div className="cfd-placeholder">
      <div className="cfd-icon">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5"/>
          <path d="M25 40 Q40 25 55 40 Q40 55 25 40" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 35 L30 40 L20 45" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M60 35 L50 40 L60 45" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="cfd-title mono">AERODYNAMIC ANALYSIS MODULE</div>
      <div className="cfd-message">
        Computational Fluid Dynamics module currently offline.
      </div>
      <div className="cfd-status mono">
        STATUS: COMING SOON...
      </div>
      <div className="cfd-note">
        "Wind tunnels are expensive. Patience is free. Mostly."
      </div>
    </div>
  );
}
