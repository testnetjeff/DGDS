import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculateFlightNumbers } from '../utils/flightNumbers';
import { simulateFlightPhysics } from '../utils/flightPhysics';
import './FlightSimulator.css';

export default function FlightSimulator({ controlPoints, setStatusMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [flightPath, setFlightPath] = useState([]);
  const [flightNumbers, setFlightNumbers] = useState({ speed: 0, glide: 0, turn: 0, fade: 0 });
  const [aeroData, setAeroData] = useState(null);
  const [throwPower, setThrowPower] = useState(0.75);
  const animationRef = useRef(null);
  const topDownCanvasRef = useRef(null);
  const sideViewCanvasRef = useRef(null);

  useEffect(() => {
    if (!controlPoints || controlPoints.length === 0) return;

    const numbers = calculateFlightNumbers(controlPoints);
    setFlightNumbers(numbers);

    const { points, aero } = simulateFlightPhysics(controlPoints, throwPower);
    setFlightPath(points);
    setAeroData(aero);
    setCurrentFrame(0);
    setIsPlaying(false);

    if (setStatusMessage && aero) {
      setStatusMessage(`L/D=${aero.LD} · Est. range ${aero.estimatedRange} ft · Max height ${aero.maxHeight} ft`);
    }
  }, [controlPoints, throwPower, setStatusMessage]);

  const drawTopDownView = useCallback(() => {
    const canvas = topDownCanvasRef.current;
    if (!canvas || flightPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    const maxX = Math.max(...flightPath.map(p => p.x), 1);
    const allY = flightPath.map(p => p.y);
    const maxAbsY = Math.max(Math.max(...allY.map(Math.abs)), 20);

    const PAD_L = 52, PAD_R = 20, PAD_T = 20, PAD_B = 28;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const scaleX = plotW / maxX;
    const halfH = plotH / 2;
    const scaleY = halfH / (maxAbsY + 10);

    const originX = PAD_L;
    const originY = PAD_T + plotH / 2;

    const toCanvasX = (x) => originX + x * scaleX;
    const toCanvasY = (y) => originY - y * scaleY;

    ctx.strokeStyle = 'rgba(130, 148, 161, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const ringDistances = [100, 200, 300, 400, 500];
    ringDistances.forEach(dist => {
      const cx = toCanvasX(dist);
      if (cx > W - PAD_R) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(130, 148, 161, 0.15)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1;
      ctx.moveTo(cx, PAD_T);
      ctx.lineTo(cx, H - PAD_B);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist}ft`, cx, H - 8);
    });

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.25)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.moveTo(originX, originY);
    ctx.lineTo(W - PAD_R, originY);
    ctx.stroke();
    ctx.setLineDash([]);

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);

    if (framesToDraw > 1) {
      for (let i = 0; i < framesToDraw; i++) {
        const p = flightPath[i];
        const n = flightPath[i + 1];
        if (!n) continue;

        const vel = p.velocity;
        const alpha = 0.25 + (i / framesToDraw) * 0.75;
        const r = Math.round(60 + (1 - vel) * 195);
        const g = Math.round(160 - (1 - vel) * 80);
        const b = Math.round(220 - (1 - vel) * 180);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = 2.5 + vel * 2;
        ctx.lineCap = 'round';
        ctx.moveTo(toCanvasX(p.x), toCanvasY(p.y));
        ctx.lineTo(toCanvasX(n.x), toCanvasY(n.y));
        ctx.stroke();
      }
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const cur = flightPath[framesToDraw];
      const cx = toCanvasX(cur.x);
      const cy = toCanvasY(cur.y);
      const discR = 8 + cur.velocity * 6;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((cur.rotation * Math.PI) / 180);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, discR);
      grad.addColorStop(0, `rgba(80, 180, 255, ${0.7 + cur.velocity * 0.3})`);
      grad.addColorStop(1, `rgba(30, 100, 200, ${0.5 + cur.velocity * 0.3})`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(10, 10, 10, 0.7)';
      ctx.arc(0, 0, discR * 0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(-discR * 0.65, 0);
      ctx.lineTo(discR * 0.65, 0);
      ctx.stroke();

      ctx.restore();

      ctx.beginPath();
      ctx.fillStyle = `rgba(60, 160, 220, ${0.08 + cur.velocity * 0.1})`;
      ctx.arc(cx, cy, discR + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('THROW', originX + 2, H - 8);

    if (aeroData) {
      ctx.fillStyle = 'rgba(130, 148, 161, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(`${aeroData.estimatedRange} ft`, W - PAD_R, 16);
    }

  }, [flightPath, currentFrame, aeroData]);

  const drawSideView = useCallback(() => {
    const canvas = sideViewCanvasRef.current;
    if (!canvas || flightPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    const maxX = Math.max(...flightPath.map(p => p.x), 1);
    const maxZ = Math.max(...flightPath.map(p => p.z), 1);

    const PAD_L = 40, PAD_R = 16, PAD_T = 14, PAD_B = 22;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const scaleX = plotW / maxX;
    const scaleZ = plotH / (maxZ * 1.1);

    const toSX = (x) => PAD_L + x * scaleX;
    const toSY = (z) => H - PAD_B - z * scaleZ;

    ctx.fillStyle = 'rgba(20, 40, 20, 0.3)';
    ctx.fillRect(PAD_L, H - PAD_B, plotW, 2);

    const heightLabels = [0, maxZ * 0.5, maxZ].map(Math.round);
    heightLabels.forEach(h => {
      const sy = toSY(h);
      ctx.strokeStyle = 'rgba(130, 148, 161, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(PAD_L, sy);
      ctx.lineTo(W - PAD_R, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${h}ft`, PAD_L - 3, sy + 3);
    });

    const apexIdx = flightPath.reduce((best, p, i) => p.z > flightPath[best].z ? i : best, 0);
    const apex = flightPath[apexIdx];
    if (apex) {
      const ax = toSX(apex.x);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 135, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.moveTo(ax, toSY(apex.z));
      ctx.lineTo(ax, H - PAD_B);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);

    if (framesToDraw > 1) {
      for (let i = 0; i < framesToDraw; i++) {
        const p = flightPath[i];
        const n = flightPath[i + 1];
        if (!n) continue;
        const vel = p.velocity;
        const r = Math.round(60 + (1 - vel) * 195);
        const g = Math.round(160 - (1 - vel) * 80);
        const b = Math.round(220 - (1 - vel) * 180);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
        ctx.lineWidth = 2 + vel * 1.5;
        ctx.lineCap = 'round';
        ctx.moveTo(toSX(p.x), toSY(p.z));
        ctx.lineTo(toSX(n.x), toSY(n.z));
        ctx.stroke();
      }
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const cur = flightPath[framesToDraw];
      const cx = toSX(cur.x);
      const cy = toSY(cur.z);
      ctx.beginPath();
      ctx.fillStyle = `rgba(60, 160, 220, ${0.6 + cur.velocity * 0.4})`;
      ctx.ellipse(cx, cy, 9, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (apex) {
      ctx.fillStyle = 'rgba(255, 135, 0, 0.8)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const ax = toSX(apex.x);
      ctx.fillText(`▲ ${Math.round(apex.z)}ft`, ax, toSY(apex.z) - 5);
    }

    ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HEIGHT', 2, 11);

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
            if (setStatusMessage) setStatusMessage('Flight simulation complete. Disc landed.');
            return prev;
          }
          return prev + 1;
        });
      }, 30);
    }
    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [isPlaying, flightPath.length, setStatusMessage]);

  const handlePlay = () => {
    if (currentFrame >= flightPath.length - 1) setCurrentFrame(0);
    setIsPlaying(true);
    if (setStatusMessage) setStatusMessage('Simulating flight trajectory...');
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    if (setStatusMessage) setStatusMessage('Flight simulation reset. Ready to launch.');
  };

  const fmt = (n) => Number(n).toFixed(2);

  const stabilityLabel = (s) => {
    const v = parseFloat(s);
    if (v < -1.0) return { label: 'UNDERSTABLE', color: '#FFE66D' };
    if (v < 0.3)  return { label: 'NEUTRAL', color: '#4ECDC4' };
    if (v < 1.5)  return { label: 'OVERSTABLE', color: '#FF8700' };
    return { label: 'VERY OVERSTABLE', color: '#FF6B6B' };
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

  const stability = aeroData ? stabilityLabel(aeroData.stability) : null;

  return (
    <div className="flight-simulator">

      <div className="aero-numbers-row">
        <div className="flight-numbers-panel">
          <div className="flight-numbers-title mono">FLIGHT NUMBERS</div>
          <div className="flight-numbers-grid">
            <div className="flight-number">
              <span className="number-label">SPEED</span>
              <span className="number-value speed">{fmt(flightNumbers.speed)}</span>
            </div>
            <div className="flight-number">
              <span className="number-label">GLIDE</span>
              <span className="number-value glide">{fmt(flightNumbers.glide)}</span>
            </div>
            <div className="flight-number">
              <span className="number-label">TURN</span>
              <span className="number-value turn">{fmt(flightNumbers.turn)}</span>
            </div>
            <div className="flight-number">
              <span className="number-label">FADE</span>
              <span className="number-value fade">{fmt(flightNumbers.fade)}</span>
            </div>
          </div>
        </div>

        {aeroData && (
          <div className="aero-panel">
            <div className="flight-numbers-title mono">AERODYNAMICS</div>
            <div className="aero-grid">
              <div className="aero-metric">
                <span className="aero-label">Cₗ</span>
                <span className="aero-value">{aeroData.Cl}</span>
              </div>
              <div className="aero-metric">
                <span className="aero-label">Cᴅ</span>
                <span className="aero-value">{aeroData.Cd}</span>
              </div>
              <div className="aero-metric">
                <span className="aero-label">L/D</span>
                <span className="aero-value ld">{aeroData.LD}</span>
              </div>
              <div className="aero-metric">
                <span className="aero-label">RANGE</span>
                <span className="aero-value range">{aeroData.estimatedRange} ft</span>
              </div>
              <div className="aero-metric">
                <span className="aero-label">APEX</span>
                <span className="aero-value">{aeroData.maxHeight} ft</span>
              </div>
              {stability && (
                <div className="aero-metric">
                  <span className="aero-label">CLASS</span>
                  <span className="aero-value" style={{ color: stability.color, fontSize: '10px' }}>{stability.label}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="throw-power-row">
        <span className="mono throw-power-label">THROW POWER</span>
        <input
          type="range"
          className="throw-power-slider"
          min="0.2"
          max="1.0"
          step="0.05"
          value={throwPower}
          onChange={e => {
            setThrowPower(parseFloat(e.target.value));
            setCurrentFrame(0);
            setIsPlaying(false);
          }}
        />
        <span className="mono throw-power-value">{Math.round(throwPower * 100)}%</span>
      </div>

      <div className="simulation-area">
        <div className="top-down-view">
          <div className="view-label mono">TOP-DOWN VIEW</div>
          <canvas
            ref={topDownCanvasRef}
            width={640}
            height={380}
            className="flight-canvas"
          />
        </div>

        <div className="side-view">
          <div className="view-label mono">SIDE VIEW — HEIGHT ARC</div>
          <canvas
            ref={sideViewCanvasRef}
            width={640}
            height={140}
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
