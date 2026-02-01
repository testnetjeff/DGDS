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
          <div className="tutorial-steps">
            <div className="step">
              <span className="step-icon">1</span>
              <span><strong>Drag points</strong> to shape the disc profile</span>
            </div>
            <div className="step">
              <span className="step-icon">2</span>
              <span><strong>Use + tool</strong> to add new anchor points</span>
            </div>
            <div className="step">
              <span className="step-icon">3</span>
              <span><strong>Use - tool</strong> to remove anchor points</span>
            </div>
            <div className="step">
              <span className="step-icon">4</span>
              <span><strong>Click 'Generate 3D'</strong> to visualize</span>
            </div>
          </div>
          <p className="tutorial-note mono">
            "Closed shapes only. We're making discs, not noodles."
          </p>
        </div>
        <button className="tutorial-btn mono" onClick={onClose}>
          BEGIN DESIGN SESSION
        </button>
      </div>
    </div>
  );
}
