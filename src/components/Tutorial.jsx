import React from 'react';
import './Tutorial.css';

export default function Tutorial({ onClose }) {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <div className="tutorial-header">
          <span className="mono">SYSTEM INITIALIZATION COMPLETE</span>
        </div>
        <div className="tutorial-content">
          <p>Welcome to Disc Golf Design Studio.</p>
          <p>
            <strong>Drag points</strong> to shape the rim profile.<br />
            <strong>Click 'Generate 3D Model'</strong> to visualize your design.
          </p>
          <p className="tutorial-note mono">
            "Precision engineering. No physics violations allowed."
          </p>
        </div>
        <button className="tutorial-btn mono" onClick={onClose}>
          BEGIN DESIGN SESSION
        </button>
      </div>
    </div>
  );
}
