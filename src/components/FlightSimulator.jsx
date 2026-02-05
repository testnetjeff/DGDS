import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateFlightNumbers, simulateFlightPath } from '../utils/flightNumbers';
import './FlightSimulator.css';

export default function FlightSimulator({ controlPoints, setStatusMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [flightPath, setFlightPath] = useState([]);
  const [flightNumbers, setFlightNumbers] = useState({ speed: 0, glide: 0, turn: 0, fade: 0 });
  const animationRef = useRef(null);
  const topDownCanvasRef = useRef(null);
  const sideViewCanvasRef = useRef(null);

  useEffect(() => {
    if (controlPoints && controlPoints.length > 0) {
      const numbers = calculateFlightNumbers(controlPoints);
      setFlightNumbers(numbers);
      const path = simulateFlightPath(numbers);
      setFlightPath(path);
      setCurrentFrame(0);
      setIsPlaying(false);
    }
  }, [controlPoints]);

  const drawTopDownView = useCallback(() => {
    const canvas = topDownCanvasRef.current;
    if (!canvas || flightPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(130, 148, 161, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const maxX = Math.max(...flightPath.map(p => p.x));
    const maxY = Math.max(...flightPath.map(p => Math.abs(p.y)));
    const scaleX = (width - 100) / maxX;
    const scaleY = (height - 100) / (maxY * 2 + 50);
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = 50;
    const offsetY = height / 2;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(width - 30, offsetY);
    ctx.stroke();
    ctx.setLineDash([]);

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);
    
    if (framesToDraw > 0) {
      for (let i = 0; i < framesToDraw; i++) {
        const point = flightPath[i];
        const nextPoint = flightPath[i + 1];
        if (!nextPoint) continue;

        const alpha = 0.3 + (i / framesToDraw) * 0.7;
        const velocity = point.velocity;
        
        const r = Math.round(60 + (1 - velocity) * 195);
        const g = Math.round(160 - (1 - velocity) * 80);
        const b = Math.round(220 - (1 - velocity) * 180);
        
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 3 + velocity * 2;
        ctx.lineCap = 'round';
        
        const x1 = offsetX + point.x * scale;
        const y1 = offsetY - point.y * scale;
        const x2 = offsetX + nextPoint.x * scale;
        const y2 = offsetY - nextPoint.y * scale;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const currentPoint = flightPath[framesToDraw];
      const discX = offsetX + currentPoint.x * scale;
      const discY = offsetY - currentPoint.y * scale;
      const discSize = 12 + currentPoint.velocity * 6;
      
      ctx.save();
      ctx.translate(discX, discY);
      ctx.rotate((currentPoint.rotation * Math.PI) / 180);
      
      ctx.beginPath();
      ctx.fillStyle = '#3ca0dc';
      ctx.arc(0, 0, discSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.fillStyle = '#1a1a1a';
      ctx.arc(0, 0, discSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.moveTo(-discSize * 0.7, 0);
      ctx.lineTo(discSize * 0.7, 0);
      ctx.stroke();
      
      ctx.restore();
      
      ctx.beginPath();
      ctx.fillStyle = 'rgba(60, 160, 220, 0.2)';
      ctx.arc(discX, discY, discSize + 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#8294A1';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('THROW', offsetX - 5, height - 20);
    ctx.fillText(`${Math.round(maxX)}ft`, width - 50, height - 20);

  }, [flightPath, currentFrame]);

  const drawSideView = useCallback(() => {
    const canvas = sideViewCanvasRef.current;
    if (!canvas || flightPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(130, 148, 161, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 30);
    ctx.lineTo(width, height - 30);
    ctx.stroke();

    const maxX = Math.max(...flightPath.map(p => p.x));
    const maxZ = Math.max(...flightPath.map(p => p.z));
    const scaleX = (width - 40) / maxX;
    const scaleZ = (height - 60) / (maxZ + 10);
    
    const offsetX = 20;
    const groundY = height - 30;

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);
    
    if (framesToDraw > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(130, 148, 161, 0.4)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i <= framesToDraw; i++) {
        const point = flightPath[i];
        const x = offsetX + point.x * scaleX;
        const y = groundY - point.z * scaleZ;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const currentPoint = flightPath[framesToDraw];
      const discX = offsetX + currentPoint.x * scaleX;
      const discY = groundY - currentPoint.z * scaleZ;
      
      ctx.beginPath();
      ctx.fillStyle = '#3ca0dc';
      ctx.ellipse(discX, discY, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#8294A1';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('HEIGHT', 5, 15);
    ctx.fillText(`${Math.round(maxZ)}ft`, width - 35, 15);

  }, [flightPath, currentFrame]);

  useEffect(() => {
    drawTopDownView();
    drawSideView();
  }, [drawTopDownView, drawSideView]);

  useEffect(() => {
    if (isPlaying && currentFrame < flightPath.length - 1) {
      animationRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= flightPath.length - 1) {
            clearInterval(animationRef.current);
            setIsPlaying(false);
            if (setStatusMessage) {
              setStatusMessage("Flight simulation complete. Disc landed.");
            }
            return prev;
          }
          return prev + 1;
        });
      }, 35);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, flightPath.length, setStatusMessage]);

  const handlePlay = () => {
    if (currentFrame >= flightPath.length - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(true);
    if (setStatusMessage) {
      setStatusMessage("Simulating flight trajectory...");
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    if (setStatusMessage) {
      setStatusMessage("Flight simulation reset. Ready to launch.");
    }
  };

  const formatNumber = (num) => {
    return num.toFixed(2);
  };

  if (!controlPoints || controlPoints.length === 0) {
    return (
      <div className="flight-simulator">
        <div className="no-profile-message">
          <span className="mono">NO PROFILE LOADED</span>
          <p>Create a disc profile in the Drafting Table first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flight-simulator">
      <div className="flight-numbers-panel">
        <div className="flight-numbers-title mono">FLIGHT NUMBERS</div>
        <div className="flight-numbers-grid">
          <div className="flight-number">
            <span className="number-label">SPEED</span>
            <span className="number-value speed">{formatNumber(flightNumbers.speed)}</span>
          </div>
          <div className="flight-number">
            <span className="number-label">GLIDE</span>
            <span className="number-value glide">{formatNumber(flightNumbers.glide)}</span>
          </div>
          <div className="flight-number">
            <span className="number-label">TURN</span>
            <span className="number-value turn">{formatNumber(flightNumbers.turn)}</span>
          </div>
          <div className="flight-number">
            <span className="number-label">FADE</span>
            <span className="number-value fade">{formatNumber(flightNumbers.fade)}</span>
          </div>
        </div>
      </div>

      <div className="simulation-area">
        <div className="top-down-view">
          <div className="view-label mono">TOP-DOWN VIEW</div>
          <canvas
            ref={topDownCanvasRef}
            width={600}
            height={400}
            className="flight-canvas"
          />
        </div>

        <div className="side-view">
          <div className="view-label mono">SIDE VIEW</div>
          <canvas
            ref={sideViewCanvasRef}
            width={600}
            height={120}
            className="flight-canvas side-canvas"
          />
        </div>
      </div>

      <div className="simulation-controls">
        {!isPlaying ? (
          <button className="sim-btn play" onClick={handlePlay}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2l10 6-10 6V2z"/>
            </svg>
            <span>THROW</span>
          </button>
        ) : (
          <button className="sim-btn pause" onClick={handlePause}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12"/>
              <rect x="9" y="2" width="4" height="12"/>
            </svg>
            <span>PAUSE</span>
          </button>
        )}
        <button className="sim-btn reset" onClick={handleReset}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span>RESET</span>
        </button>
        <div className="progress-indicator mono">
          {Math.round((currentFrame / Math.max(1, flightPath.length - 1)) * 100)}% COMPLETE
        </div>
      </div>
    </div>
  );
}
