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
  const statusRef = useRef(setStatusMessage);
  useEffect(() => { statusRef.current = setStatusMessage; }, [setStatusMessage]);

  useEffect(() => {
    if (!controlPoints || controlPoints.length === 0) return;

    const numbers = calculateFlightNumbers(controlPoints);
    setFlightNumbers(numbers);

    const { points, aero } = simulateFlightPhysics(controlPoints, throwPower);
    setFlightPath(points);
    setAeroData(aero);
    setCurrentFrame(0);
    setIsPlaying(false);

    if (aero && statusRef.current) {
      statusRef.current(`L/D=${aero.LD} · Est. range ${aero.estimatedRange} ft · Apex ${aero.maxHeight} ft`);
    }
  }, [controlPoints, throwPower]);

  const drawTopDownView = useCallback(() => {
    const canvas = topDownCanvasRef.current;
    if (!canvas || flightPath.length === 0) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    const MARGIN = 50;

    const xs = flightPath.map(p => p.x).filter(isFinite);
    const ys = flightPath.map(p => p.y).filter(isFinite);
    if (xs.length === 0) return;

    const maxX  = Math.max(...xs, 1);
    const absYs = ys.map(Math.abs);
    const maxAbsY = absYs.length > 0 ? Math.max(...absYs, 10) : 10;

    const scaleX = (W - MARGIN * 2) / maxX;
    const scaleY = ((H / 2) - MARGIN) / (maxAbsY + 5);
    const scale  = Math.min(scaleX, scaleY, 6);

    const ox = MARGIN;
    const oy = H / 2;

    const tx = (x) => ox + x * scale;
    const ty = (y) => oy - y * scale;

    ctx.strokeStyle = 'rgba(130, 148, 161, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    [100, 200, 300, 400, 500].forEach(dist => {
      const px = tx(dist);
      if (px > W - 10) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(130, 148, 161, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.moveTo(px, MARGIN / 2);
      ctx.lineTo(px, H - MARGIN / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(130, 148, 161, 0.55)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist}ft`, px, H - 10);
    });

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.2)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.moveTo(ox, oy);
    ctx.lineTo(W - 10, oy);
    ctx.stroke();
    ctx.setLineDash([]);

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);

    for (let i = 0; i < framesToDraw; i++) {
      const p = flightPath[i];
      const n = flightPath[i + 1];
      if (!n || !isFinite(p.x) || !isFinite(n.x)) continue;
      const vel = p.velocity;
      const alpha = 0.25 + (i / Math.max(framesToDraw, 1)) * 0.75;
      const r = Math.round(60 + (1 - vel) * 195);
      const g = Math.round(160 - (1 - vel) * 80);
      const b = Math.round(220 - (1 - vel) * 180);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = 2.5 + vel * 2;
      ctx.lineCap = 'round';
      ctx.moveTo(tx(p.x), ty(p.y));
      ctx.lineTo(tx(n.x), ty(n.y));
      ctx.stroke();
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const cur = flightPath[framesToDraw];
      if (!isFinite(cur.x) || !isFinite(cur.y)) return;

      const discX = tx(cur.x);
      const discY = ty(cur.y);
      const discR = 9 + cur.velocity * 6;

      ctx.save();
      ctx.translate(discX, discY);
      ctx.rotate((cur.rotation * Math.PI) / 180);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, discR);
      grad.addColorStop(0, `rgba(80,180,255,${0.7 + cur.velocity * 0.3})`);
      grad.addColorStop(1, `rgba(30,100,200,${0.5 + cur.velocity * 0.3})`);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(8,8,8,0.75)';
      ctx.arc(0, 0, discR * 0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(-discR * 0.65, 0);
      ctx.lineTo(discR * 0.65, 0);
      ctx.stroke();

      ctx.restore();

      ctx.beginPath();
      ctx.fillStyle = `rgba(60,160,220,${0.07 + cur.velocity * 0.09})`;
      ctx.arc(discX, discY, discR + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(130,148,161,0.5)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('THROW', ox, H - 10);
    if (aeroData) {
      ctx.textAlign = 'right';
      ctx.fillText(`~${aeroData.estimatedRange} ft`, W - 8, H - 10);
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

    const xs = flightPath.map(p => p.x).filter(isFinite);
    const zs = flightPath.map(p => p.z).filter(isFinite);
    if (xs.length === 0) return;

    const maxX = Math.max(...xs, 1);
    const maxZ = Math.max(...zs, 1);

    const PAD_L = 36, PAD_R = 12, PAD_T = 16, PAD_B = 22;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    const scaleX = plotW / maxX;
    const scaleZ = plotH / (maxZ * 1.15);

    const toSX = (x) => PAD_L + x * scaleX;
    const toSY = (z) => H - PAD_B - z * scaleZ;

    ctx.fillStyle = 'rgba(20,40,20,0.35)';
    ctx.fillRect(PAD_L, H - PAD_B, plotW, 2);

    [0, Math.round(maxZ / 2), Math.round(maxZ)].forEach(h => {
      const sy = toSY(h);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(130,148,161,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.moveTo(PAD_L, sy);
      ctx.lineTo(W - PAD_R, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(130,148,161,0.5)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${h}ft`, PAD_L - 3, sy + 3);
    });

    const apexIdx = flightPath.reduce(
      (best, p, i) => (isFinite(p.z) && p.z > (flightPath[best]?.z ?? 0) ? i : best), 0
    );
    const apex = flightPath[apexIdx];
    if (apex && isFinite(apex.x)) {
      const ax = toSX(apex.x);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,135,0,0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.moveTo(ax, toSY(apex.z));
      ctx.lineTo(ax, H - PAD_B);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,135,0,0.85)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`▲ ${Math.round(apex.z)}ft`, ax, toSY(apex.z) - 5);
    }

    const framesToDraw = Math.min(currentFrame, flightPath.length - 1);
    for (let i = 0; i < framesToDraw; i++) {
      const p = flightPath[i];
      const n = flightPath[i + 1];
      if (!n || !isFinite(p.x) || !isFinite(n.x)) continue;
      const vel = p.velocity;
      const r = Math.round(60 + (1 - vel) * 195);
      const g = Math.round(160 - (1 - vel) * 80);
      const b = Math.round(220 - (1 - vel) * 180);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
      ctx.lineWidth = 2 + vel * 1.5;
      ctx.lineCap = 'round';
      ctx.moveTo(toSX(p.x), toSY(p.z));
      ctx.lineTo(toSX(n.x), toSY(n.z));
      ctx.stroke();
    }

    if (framesToDraw >= 0 && framesToDraw < flightPath.length) {
      const cur = flightPath[framesToDraw];
      if (isFinite(cur.x)) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(60,160,220,${0.6 + cur.velocity * 0.4})`;
        ctx.ellipse(toSX(cur.x), toSY(cur.z), 9, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = 'rgba(130,148,161,0.5)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HEIGHT', 2, 11);
  }, [flightPath, currentFrame]);

  useEffect(() => {
    drawTopDownView();
    drawSideView();
  }, [drawTopDownView, drawSideView]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentFrame >= flightPath.length - 1) return;

    animationRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= flightPath.length - 1) {
          clearInterval(animationRef.current);
          setIsPlaying(false);
          if (statusRef.current) statusRef.current('Flight simulation complete. Disc landed.');
          return prev;
        }
        return prev + 1;
      });
    }, 30);

    return () => { if (animationRef.current) clearInterval(animationRef.current); };
  }, [isPlaying, flightPath.length]);

  const handlePlay = () => {
    if (currentFrame >= flightPath.length - 1) setCurrentFrame(0);
    setIsPlaying(true);
    if (statusRef.current) statusRef.current('Simulating flight trajectory...');
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    if (statusRef.current) statusRef.current('Flight simulation reset. Ready to launch.');
  };

  const fmt = (n) => Number(n).toFixed(2);

  const stabilityLabel = (s) => {
    const v = parseFloat(s);
    if (v < -1.0) return { label: 'UNDERSTABLE', color: '#FFE66D' };
    if (v < 0.3)  return { label: 'NEUTRAL',     color: '#4ECDC4' };
    if (v < 1.5)  return { label: 'OVERSTABLE',  color: '#FF8700' };
    return              { label: 'V.OVERSTABLE', color: '#FF6B6B' };
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
                  <span className="aero-value" style={{ color: stability.color, fontSize: '10px' }}>
                    {stability.label}
                  </span>
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
          <canvas ref={topDownCanvasRef} width={640} height={380} className="flight-canvas" />
        </div>
        <div className="side-view">
          <div className="view-label mono">SIDE VIEW — HEIGHT ARC</div>
          <canvas ref={sideViewCanvasRef} width={640} height={140} className="flight-canvas side-canvas" />
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
