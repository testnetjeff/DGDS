import React, { useState, useEffect, useRef } from 'react';
import './CalculationTerminal.css';

export default function CalculationTerminal({ 
  isOpen, 
  onClose, 
  calculationSteps,
  finalResult,
  buttonRef
}) {
  const [displayedSteps, setDisplayedSteps] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const terminalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const windowWidth = window.innerWidth;
      setPosition({ 
        x: Math.max(10, (windowWidth - 600) / 2), 
        y: 80 
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && calculationSteps && calculationSteps.length > 0) {
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
        }
      }, 80);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, calculationSteps]);

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
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e) => {
      if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const newX = touch.clientX - dragOffset.x;
        const newY = touch.clientY - dragOffset.y;
        setPosition({
          x: Math.max(0, Math.min(newX, window.innerWidth - 300)),
          y: Math.max(0, Math.min(newY, window.innerHeight - 100))
        });
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

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

  if (!isOpen) return null;

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
      <div className="calculation-terminal" ref={terminalRef}>
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
          <span className="terminal-title mono">AIRFOIL_ANALYSIS.exe</span>
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
          <div className="terminal-intro">
            <span className="prompt">$</span> ./calculate_lift_coefficient --profile=current
          </div>
          
          {displayedSteps.map((step, index) => renderStep(step, index))}
          
          {isCalculating && (
            <div className="terminal-cursor">
              <span className="cursor-block">▌</span>
            </div>
          )}
          
          {!isCalculating && finalResult && (
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
        </div>
        
        <div className="terminal-footer">
          <span className="status-indicator">
            {isCalculating ? '● PROCESSING' : '○ COMPLETE'}
          </span>
          <span className="mono">THIN AIRFOIL THEORY v1.0</span>
        </div>
      </div>
    </div>
  );
}
