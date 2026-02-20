import React, { useState, useEffect, useRef } from 'react';
import { getProfileMetrics } from '../utils/profileMetrics';
import { applyDimensionTargets } from '../utils/applyDimensionTargets';
import './DimensionsToolbar.css';

const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 180;
const DEFAULT_PANEL_WIDTH = 520;
const DEFAULT_PANEL_HEIGHT = 420;

const DIMENSION_TOOLTIPS = {
  diameter: { title: 'Diameter', body: 'Total width of the disc. PDGA limits 210–215 mm. Affects glide and speed class.' },
  height: { title: 'Height', body: 'Vertical extent of the profile. Affects rim depth and how the disc fits in the hand.' },
  rimWidth: { title: 'Rim width', body: 'Distance from outer edge to inner wall. Wider rims (up to ~2.5 cm) correlate with higher Speed rating and require more spin to stabilize.' },
  rimDepth: { title: 'Rim depth', body: 'Vertical distance from flight plate to bottom of rim. Deeper rims (putters) give more grip; shallow rims (drivers) cut through the air.' },
  insideRimDiameter: { title: 'Inside rim diameter', body: 'Open space under the flight plate (diameter minus twice rim width). Affects weight distribution and feel.' },
  noseRadius: { title: 'Nose radius', body: 'Sharpness of the outer edge. Blunt (large R) = putters, low drag; sharp (small R) = drivers. PDGA regulates for safety.' },
  plh: { title: 'Parting line height (PLH)', body: 'Height where mold halves meet at the outer edge. Higher PLH = nose sits higher = more overstable; lower = more understable.' },
  domeRadius: { title: 'Dome', body: 'Curvature of the top surface. Flatter = less glide, wind-cutting; domier = more glide, more trapped air underneath.' },
  shoulderSlant: { title: 'Shoulder slant', body: 'Angle where flight plate meets the rim. Gradual = smoother airfoil; steep = more overstable, utility-style.' },
};

const DIMENSION_KEYS = [
  { key: 'diameter', label: 'Diameter', unit: 'mm', currentKey: 'diameterStr' },
  { key: 'height', label: 'Height', unit: 'mm', currentKey: 'heightStr' },
  { key: 'rimWidth', label: 'Rim width', unit: 'mm', currentKey: 'rimWidthStr' },
  { key: 'rimDepth', label: 'Rim depth', unit: 'mm', currentKey: 'rimDepthStr' },
  { key: 'insideRimDiameter', label: 'Inside Ø', unit: 'mm', currentKey: 'insideRimDiameterStr' },
  { key: 'noseRadius', label: 'Nose R', unit: 'mm', currentKey: 'noseRadiusStr' },
  { key: 'partingLineHeight', label: 'PLH', unit: 'mm', currentKey: 'plhStr' },
  { key: 'domeRadius', label: 'Dome', unit: 'mm', currentKey: 'domeRadiusStr' },
  { key: 'shoulderSlantDeg', label: 'Shoulder', unit: '°', currentKey: 'shoulderSlantStr' },
];

export default function DimensionsToolbar({ controlPoints, onControlPointsChange }) {
  const [position, setPosition] = useState(() => ({
    x: 10,
    y: Math.max(80, (typeof window !== 'undefined' ? window.innerHeight : 600) - 420)
  }));
  const [size, setSize] = useState({ width: DEFAULT_PANEL_WIDTH, height: DEFAULT_PANEL_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState(null);
  const [tooltipKey, setTooltipKey] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 340)),
          y: Math.max(0, Math.min(newY, window.innerHeight - 120))
        });
      } else if (isResizing) {
        const start = resizeStartRef.current;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.85;
        const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxW, start.width + (e.clientX - start.x)));
        const newHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH, start.height + (e.clientY - start.y)));
        setSize({ width: newWidth, height: newHeight });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    };
    const handleTouchMove = (e) => {
      if (e.touches.length !== 1) return;
      if (isResizing) e.preventDefault();
      const t = e.touches[0];
      if (isDragging) {
        const newX = t.clientX - dragOffset.x;
        const newY = t.clientY - dragOffset.y;
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 340)),
          y: Math.max(0, Math.min(newY, window.innerHeight - 120))
        });
      } else if (isResizing) {
        const start = resizeStartRef.current;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.85;
        const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(maxW, start.width + (t.clientX - start.x)));
        const newHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(maxH, start.height + (t.clientY - start.y)));
        setSize({ width: newWidth, height: newHeight });
      }
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    };
    if (isDragging || isResizing) {
      if (isResizing) document.body.style.cursor = 'nwse-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    };
  }, [isDragging, isResizing, dragOffset]);

  const handleDragStart = (e) => {
    e.preventDefault();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setDragOffset({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setIsResizing(true);
    resizeStartRef.current = { x: clientX, y: clientY, width: size.width, height: size.height };
  };

  const handleFormChange = (key, value) => {
    setError(null);
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    setError(null);
    const targets = {};
    DIMENSION_KEYS.forEach(({ key }) => {
      const raw = formValues[key];
      if (raw === '' || raw == null) return;
      const trimmed = String(raw).trim();
      if (!trimmed) return;
      const num = parseFloat(trimmed);
      if (!Number.isFinite(num)) return;
      targets[key] = num;
    });
    if (Object.keys(targets).length === 0) {
      setError('Enter at least one new dimension.');
      return;
    }
    const result = applyDimensionTargets(controlPoints, targets);
    if (result.error) {
      setError(result.error);
      return;
    }
    onControlPointsChange(result.controlPoints);
  };

  const metrics = getProfileMetrics(controlPoints);

  const scaleW = size.width / DEFAULT_PANEL_WIDTH;
  const scaleH = size.height / DEFAULT_PANEL_HEIGHT;
  const scale = Math.max(0.65, Math.min(1.5, Math.min(scaleW, scaleH)));

  return (
    <div
      className="dimensions-toolbar-overlay"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div
        className="dimensions-toolbar-panel"
        style={{
          width: size.width,
          height: size.height,
          minWidth: MIN_PANEL_WIDTH,
          minHeight: MIN_PANEL_HEIGHT,
          maxWidth: '90vw',
          maxHeight: '85vh',
          '--dim-scale': scale
        }}
      >
        <div
          className={`dimensions-toolbar-header ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="dimensions-toolbar-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="dimensions-toolbar-title">DIMENSIONS</span>
          <span className="dimensions-toolbar-drag-hint">⋮⋮</span>
        </div>

        <div className="dimensions-toolbar-content">
          <div className="dimensions-section-title">Current dimensions</div>
          {metrics && (
            <div className="dimensions-current-grid">
              {DIMENSION_KEYS.map(({ key, label, currentKey }) => (
                <div key={key} className="dimensions-current-item">
                  <label>{label}:</label>
                  <span className="value">{metrics[currentKey] ?? '—'}</span>
                  <span
                    className="dimensions-help-icon"
                    onMouseEnter={(e) => {
                      setTooltipKey(key === 'partingLineHeight' ? 'plh' : key === 'shoulderSlantDeg' ? 'shoulderSlant' : key);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltipKey(null)}
                    title={DIMENSION_TOOLTIPS[key === 'partingLineHeight' ? 'plh' : key === 'shoulderSlantDeg' ? 'shoulderSlant' : key]?.title}
                  >
                    ?
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="dimensions-section-title">New dimensions</div>
          <div className="dimensions-new-grid">
            {DIMENSION_KEYS.map(({ key, label, unit }) => (
              <div key={key} className="dimensions-new-item">
                <label htmlFor={`dim-${key}`}>{label} ({unit})</label>
                <input
                  id={`dim-${key}`}
                  type="text"
                  placeholder="—"
                  value={formValues[key] ?? ''}
                  onChange={(e) => handleFormChange(key, e.target.value)}
                  aria-label={`New ${label}`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="dimensions-toolbar-footer">
          {error && <div className="dimensions-toolbar-error" role="alert">{error}</div>}
          <button type="button" className="dimensions-toolbar-apply" onClick={handleApply}>
            Apply
          </button>
        </div>
        <div
          className="dimensions-toolbar-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          role="presentation"
          aria-label="Resize panel"
        />
      </div>

      {tooltipKey && DIMENSION_TOOLTIPS[tooltipKey] && (
        <div
          className="dimensions-tooltip-popover"
          style={{
            left: Math.min(tooltipPos.x + 12, window.innerWidth - 280),
            top: Math.max(tooltipPos.y - 8, 8),
            transform: 'translateY(-100%)'
          }}
        >
          <div className="title">{DIMENSION_TOOLTIPS[tooltipKey].title}</div>
          <div className="body">{DIMENSION_TOOLTIPS[tooltipKey].body}</div>
        </div>
      )}
    </div>
  );
}
