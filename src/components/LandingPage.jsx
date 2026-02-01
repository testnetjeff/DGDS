import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

const statusMessages = [
  'Initializing geometry engine...',
  'Loading Bezier curve algorithms...',
  'Calibrating 3D renderer...',
  'Preparing design workspace...',
  'System ready.'
];

export default function LandingPage({ onEnter }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => onEnter(), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    const statusInterval = setInterval(() => {
      setStatusIndex(prev => {
        if (prev >= statusMessages.length - 1) {
          clearInterval(statusInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, [isLoading, onEnter]);

  const handleStart = () => {
    setIsLoading(true);
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="logo-container">
          <img src={logo} alt="Alumicube Engineering" className="company-logo" />
        </div>
        
        <h1 className="app-title">DISC GOLF DESIGN STUDIO</h1>

        {!isLoading ? (
          <button className="start-button" onClick={handleStart}>
            <span className="button-text">START DESIGNING</span>
            <span className="button-glow"></span>
          </button>
        ) : (
          <div className="loading-container">
            <div className="loading-bar-track">
              <div 
                className="loading-bar-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="loading-status">
              {statusMessages[statusIndex]}
            </div>
            <div className="loading-percent">{progress}%</div>
          </div>
        )}
      </div>

      <div className="landing-particles">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="landing-footer">
        <span>Alumicube Engineering 2026</span>
        <span className="footer-divider">|</span>
        <span>Precision Design Tools</span>
      </div>
    </div>
  );
}
