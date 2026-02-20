import React, { useState, useEffect, useRef } from 'react';
import './CalculationTerminal.css';
import { getLdInterpretation } from '../utils/ldInterpretation';

const BASE_STEP_MS = 35;
const MIN_TERMINAL_WIDTH = 320;
const MIN_TERMINAL_HEIGHT = 200;
const DEFAULT_TERMINAL_WIDTH = 600;
const DEFAULT_TERMINAL_HEIGHT = 400;

export default function CalculationTerminal({ 
  isOpen, 
  onClose, 
  calculationSteps,
  finalResult,
  buttonRef,
  variant = 'cl',
  positionSlot,
  onAnimationComplete,
  stepInterval
}) {
  const [displayedSteps, setDisplayedSteps] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 80 });
  const [size, setSize] = useState({ width: DEFAULT_TERMINAL_WIDTH, height: DEFAULT_TERMINAL_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const terminalRef = useRef(null);
  const contentRef = useRef(null);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    if (isOpen) {
      const windowWidth = window.innerWidth;
      const y = 80;
      if (positionSlot === 0) {
        setPosition({ x: 10, y });
      } else if (positionSlot === 2) {
        setPosition({ x: Math.max(10, windowWidth - 610), y });
      } else {
        setPosition({ x: Math.max(10, (windowWidth - 600) / 2), y });
      }
    }
  }, [isOpen, positionSlot]);

  useEffect(() => {
    if (isOpen && calculationSteps && calculationSteps.length > 0 && variant !== 'ld') {
      setDisplayedSteps([]);
      setIsCalculating(true);
      
      let stepIndex = 0;
      const stepsToShow = [...calculationSteps];
      
      const interval = setInterval(() => {
        if (stepIndex < stepsToShow.length) {
          const currentStep = stepsToShow[stepIndex];
          if (currentStep) {
            setDisplayedSteps(prev => [...prev, currentStep]);
          }
          stepIndex++;
        } else {
          clearInterval(interval);
          setIsCalculating(false);
          if (variant !== 'ld') {
            onAnimationCompleteRef.current?.();
          }
        }
      }, stepInterval ?? BASE_STEP_MS);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, calculationSteps, variant]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayedSteps]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 300)),
          y: Math.max(0, Math.min(newY, window.innerHeight - 100))
        });
      } else if (isResizing) {
        const start = resizeStartRef.current;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.85;
        const newWidth = Math.max(MIN_TERMINAL_WIDTH, Math.min(maxW, start.width + (e.clientX - start.x)));
        const newHeight = Math.max(MIN_TERMINAL_HEIGHT, Math.min(maxH, start.height + (e.clientY - start.y)));
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
      const touch = e.touches[0];
      if (isDragging) {
        const newX = touch.clientX - dragOffset.x;
        const newY = touch.clientY - dragOffset.y;
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 300)),
          y: Math.max(0, Math.min(newY, window.innerHeight - 100))
        });
      } else if (isResizing) {
        const start = resizeStartRef.current;
        const maxW = window.innerWidth * 0.9;
        const maxH = window.innerHeight * 0.85;
        const newWidth = Math.max(MIN_TERMINAL_WIDTH, Math.min(maxW, start.width + (touch.clientX - start.x)));
        const newHeight = Math.max(MIN_TERMINAL_HEIGHT, Math.min(maxH, start.height + (touch.clientY - start.y)));
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
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    setIsResizing(true);
    resizeStartRef.current = { x: clientX, y: clientY, width: size.width, height: size.height };
  };

  if (!isOpen) return null;

  const scaleW = size.width / DEFAULT_TERMINAL_WIDTH;
  const scaleH = size.height / DEFAULT_TERMINAL_HEIGHT;
  const scale = Math.max(0.65, Math.min(1.5, Math.min(scaleW, scaleH)));

  const getStepClass = (type) => {
    switch (type) {
      case 'header': return 'step-header';
      case 'divider': return 'step-divider';
      case 'info': return 'step-info';
      case 'code': return 'step-code';
      case 'calc': return 'step-calc';
      case 'result': return 'step-result';
      case 'formula': return 'step-formula';
      case 'final': return 'step-final';
      case 'error': return 'step-error';
      case 'success': return 'step-success';
      default: return 'step-default';
    }
  };

  const renderStep = (step, index) => {
    if (!step) return null;
    if (step.type === 'divider') {
      return <div key={index} className="step-divider">{'─'.repeat(50)}</div>;
    }
    return (
      <div key={index} className={`terminal-step ${getStepClass(step.type)}`}>
        {step.type === 'code' && <span className="line-number">{String(index).padStart(3, '0')}</span>}
        <span className="step-text">{step.text}</span>
      </div>
    );
  };

  return (
    <div 
      className="calculation-terminal-overlay"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none'
      }}
    >
      <div
        className="calculation-terminal"
        ref={terminalRef}
        style={{
          width: size.width,
          height: size.height,
          minWidth: MIN_TERMINAL_WIDTH,
          minHeight: MIN_TERMINAL_HEIGHT,
          maxWidth: '90vw',
          maxHeight: '85vh',
          '--term-scale': scale
        }}
      >
        <div 
          className={`terminal-header ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="terminal-title mono">
            {variant === 'cd' ? 'DRAG_ANALYSIS.exe' : variant === 'ld' ? 'L/D_RATIO.exe' : 'AIRFOIL_ANALYSIS.exe'}
          </span>
          <span className="drag-hint">⋮⋮</span>
          <button 
            className="terminal-close" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >×</button>
        </div>
        
        <div className="terminal-content" ref={contentRef}>
          {variant !== 'ld' && (
            <div className="terminal-intro">
              <span className="prompt">$</span> {variant === 'cd' ? './calculate_drag_coefficient --profile=current' : './calculate_lift_coefficient --profile=current'}
            </div>
          )}
          
          {variant !== 'ld' && displayedSteps.map((step, index) => renderStep(step, index))}
          
          {isCalculating && (
            <div className="terminal-cursor">
              <span className="cursor-block">▌</span>
            </div>
          )}
          
          {!isCalculating && finalResult && variant === 'cl' && (
            <div className="terminal-summary">
              <div className="summary-box">
                <div className="summary-title">COMPUTED LIFT COEFFICIENT</div>
                <div className="summary-value">{finalResult.cl?.toFixed(4) || 'N/A'}</div>
                <div className="summary-details">
                  <div>Camber: {((finalResult.camberRatio || 0) * 100).toFixed(2)}%</div>
                  <div>Max Camber @ {((finalResult.maxCamberPosition || 0) * 100).toFixed(1)}% chord</div>
                  <div>Zero-lift α: {(finalResult.alphaZeroLift || 0).toFixed(2)}°</div>
                </div>
              </div>
            </div>
          )}
          
          {!isCalculating && finalResult && variant === 'cd' && (
            <div className="terminal-summary">
              <div className="summary-box">
                <div className="summary-title">COMPUTED DRAG COEFFICIENT</div>
                <div className="summary-value">{finalResult.cd?.toFixed(4) ?? 'N/A'}</div>
                <div className="summary-details">
                  <div>Re: {(finalResult.re ?? 0).toFixed(0)}</div>
                  <div>Thickness (t/c): {((finalResult.thicknessRatio ?? 0) * 100).toFixed(2)}%</div>
                  <div>Cd_friction: {(finalResult.cdFriction ?? 0).toFixed(4)}</div>
                  <div>Cd_form: {(finalResult.cdForm ?? 0).toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}

          {variant === 'ld' && finalResult && (
            <div className="terminal-summary ld-reveal">
              <div className="summary-box">
                <div className="summary-title">LIFT-TO-DRAG RATIO</div>
                <div className="summary-value ld-reveal-value">
                  {finalResult.ld != null && finalResult.ld !== Infinity && !Number.isNaN(finalResult.ld)
                    ? finalResult.ld.toFixed(4)
                    : 'N/A'}
                </div>
                <div className="summary-details">
                  <div>Cₗ: {finalResult.cl != null && !finalResult.error ? finalResult.cl.toFixed(4) : 'N/A'}</div>
                  <div>Cd: {finalResult.cd != null && !finalResult.error ? finalResult.cd.toFixed(4) : 'N/A'}</div>
                  <div>L/D = Cₗ / Cd</div>
                </div>
                {(() => {
                  const { message, hint } = getLdInterpretation(finalResult.ld);
                  if (!message) return null;
                  return (
                    <div className="ld-interpretation">
                      <p className="ld-interpretation-message">{message}</p>
                      {hint && <p className="ld-interpretation-hint">{hint}</p>}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        
        <div className="terminal-footer">
          <span className="status-indicator">
            {variant === 'ld' ? '○ COMPLETE' : isCalculating ? '● PROCESSING' : '○ COMPLETE'}
          </span>
          <span className="mono">
            {variant === 'cd' ? 'APPROX. DRAG v1.0' : variant === 'ld' ? 'L/D RATIO v1.0' : 'THIN AIRFOIL THEORY v1.0'}
          </span>
        </div>
        <div
          className="calculation-terminal-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          role="presentation"
          aria-label="Resize terminal"
        />
      </div>
    </div>
  );
}
