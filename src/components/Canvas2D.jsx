import React, { useRef, useEffect, useState, useCallback } from 'react';
import { generateBezierPoints, getReferenceDiscProfile } from '../utils/bezier';
import { constrainPoint } from '../utils/pdgaConstraints';

const SCALE = 3;
const OFFSET_X = 50;
const OFFSET_Y = 150;

export default function Canvas2D({ controlPoints, setControlPoints, pdgaMode }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const toCanvas = useCallback((point) => ({
    x: point.x * SCALE + OFFSET_X,
    y: point.y * SCALE + OFFSET_Y
  }), []);

  const fromCanvas = useCallback((x, y) => ({
    x: (x - OFFSET_X) / SCALE,
    y: (y - OFFSET_Y) / SCALE
  }), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(OFFSET_X, 0);
    ctx.lineTo(OFFSET_X, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, OFFSET_Y);
    ctx.lineTo(width, OFFSET_Y);
    ctx.stroke();
    
    const refProfile = getReferenceDiscProfile();
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    refProfile.forEach((p, i) => {
      const cp = toCanvas(p);
      if (i === 0) ctx.moveTo(cp.x, cp.y);
      else ctx.lineTo(cp.x, cp.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < controlPoints.length - 1; i += 3) {
      const p0 = toCanvas(controlPoints[i]);
      const p1 = toCanvas(controlPoints[i + 1] || controlPoints[i]);
      const p2 = toCanvas(controlPoints[i + 2] || controlPoints[i + 1] || controlPoints[i]);
      const p3 = toCanvas(controlPoints[i + 3] || controlPoints[i + 2] || controlPoints[i + 1] || controlPoints[i]);
      
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.stroke();
    }
    
    const bezierPoints = generateBezierPoints(controlPoints, 50);
    
    let hasConstrainedPoints = false;
    if (pdgaMode) {
      controlPoints.forEach(p => {
        if (p.isConstrained) hasConstrainedPoints = true;
      });
    }
    
    ctx.strokeStyle = hasConstrainedPoints ? '#FF8700' : '#8294A1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    bezierPoints.forEach((p, i) => {
      const cp = toCanvas(p);
      if (i === 0) ctx.moveTo(cp.x, cp.y);
      else ctx.lineTo(cp.x, cp.y);
    });
    ctx.stroke();
    
    controlPoints.forEach((point, index) => {
      const cp = toCanvas(point);
      const isHovered = hoveredPoint === index;
      const isAnchor = point.type === 'anchor';
      
      ctx.fillStyle = isAnchor 
        ? (isHovered ? '#FF8700' : '#8294A1')
        : (isHovered ? '#FF8700' : 'rgba(130, 148, 161, 0.6)');
      
      ctx.beginPath();
      if (isAnchor) {
        ctx.arc(cp.x, cp.y, isHovered ? 10 : 8, 0, Math.PI * 2);
      } else {
        const size = isHovered ? 7 : 5;
        ctx.rect(cp.x - size, cp.y - size, size * 2, size * 2);
      }
      ctx.fill();
      
      if (point.isConstrained) {
        ctx.strokeStyle = '#FF8700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
  }, [controlPoints, hoveredPoint, pdgaMode, toCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        draw();
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const findPointAtPos = (pos) => {
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = toCanvas(controlPoints[i]);
      const dist = Math.sqrt((pos.x - cp.x) ** 2 + (pos.y - cp.y) ** 2);
      if (dist < 15) return i;
    }
    return null;
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    const pointIndex = findPointAtPos(pos);
    if (pointIndex !== null) {
      setDragging(pointIndex);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    
    if (dragging !== null) {
      const newPos = fromCanvas(pos.x, pos.y);
      const constrainedPos = constrainPoint(newPos, pdgaMode, controlPoints);
      
      setControlPoints(prev => {
        const newPoints = [...prev];
        newPoints[dragging] = {
          ...newPoints[dragging],
          x: constrainedPos.x,
          y: constrainedPos.y,
          isConstrained: constrainedPos.isConstrained
        };
        return newPoints;
      });
    } else {
      const pointIndex = findPointAtPos(pos);
      setHoveredPoint(pointIndex);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleMouseLeave = () => {
    setDragging(null);
    setHoveredPoint(null);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: hoveredPoint !== null ? 'grab' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}
