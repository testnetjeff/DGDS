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
  const terminalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen && calculationSteps && calculationSteps.length > 0) {
      setDisplayedSteps([]);
      setIsCalculating(true);
      
      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex < calculationSteps.length) {
          setDisplayedSteps(prev => [...prev, calculationSteps[stepIndex]]);
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
    <div className="calculation-terminal-overlay">
      <div className="connector-line" />
      <div className="calculation-terminal" ref={terminalRef}>
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="terminal-title mono">AIRFOIL_ANALYSIS.exe</span>
          <button className="terminal-close" onClick={onClose}>×</button>
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
