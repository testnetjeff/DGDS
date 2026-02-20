import React, { useRef, useEffect, useState, useCallback } from 'react';
import { generateBezierPoints, getReferenceDiscProfile, addAnchorPoint, deleteAnchorPoint, findNearestSegment, getAnchors } from '../utils/bezier';
import { constrainPoint } from '../utils/pdgaConstraints';
import './Canvas2D.css';

const SCALE = 3;

export default function Canvas2D({ controlPoints, setControlPoints, pdgaMode, editMode, setStatusMessage, panOffset, setPanOffset, zoom, setZoom, onDragStart, onDragEnd }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [touchState, setTouchState] = useState({ 
    lastTouchDist: null, 
    lastTouchCenter: null,
    activeTouches: 0
  });
  const dragEndFiredRef = useRef(false);
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [marqueeStart, setMarqueeStart] = useState(null);
  const [marqueeEnd, setMarqueeEnd] = useState(null);
  const selectionDragStateRef = useRef(null);
  const offsetX = canvasSize.width / 2 + panOffset.x;
  const offsetY = canvasSize.height / 2 + panOffset.y;

  const effectiveScale = SCALE * zoom;

  const toCanvas = useCallback((point) => ({
    x: point.x * effectiveScale + offsetX,
    y: point.y * effectiveScale + offsetY
  }), [offsetX, offsetY, effectiveScale]);

  const fromCanvas = useCallback((x, y) => ({
    x: (x - offsetX) / effectiveScale,
    y: (y - offsetY) / effectiveScale
  }), [offsetX, offsetY, effectiveScale]);

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
    
    const gridSize = 30 * zoom;
    const startX = offsetX % gridSize;
    const startY = offsetY % gridSize;
    
    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
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
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.strokeStyle = 'rgba(130, 148, 161, 0.3)';
    ctx.lineWidth = 1;
    
    controlPoints.forEach((point, idx) => {
      if (point.type === 'control') {
        const cp = toCanvas(point);
        
        if (idx > 0 && controlPoints[idx - 1]?.type === 'anchor') {
          const anchor = toCanvas(controlPoints[idx - 1]);
          ctx.beginPath();
          ctx.moveTo(anchor.x, anchor.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.stroke();
        }
        
        if (idx < controlPoints.length - 1 && controlPoints[idx + 1]?.type === 'anchor') {
          const anchor = toCanvas(controlPoints[idx + 1]);
          ctx.beginPath();
          ctx.moveTo(anchor.x, anchor.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.stroke();
        }
      }
    });
    
    const firstAnchorIdx = controlPoints.findIndex(p => p.type === 'anchor');
    if (firstAnchorIdx > 0 && controlPoints[controlPoints.length - 1]?.type === 'control') {
      const lastHandle = toCanvas(controlPoints[controlPoints.length - 1]);
      const firstAnchor = toCanvas(controlPoints[firstAnchorIdx]);
      ctx.beginPath();
      ctx.moveTo(firstAnchor.x, firstAnchor.y);
      ctx.lineTo(lastHandle.x, lastHandle.y);
      ctx.stroke();
    }
    
    const bezierPoints = generateBezierPoints(controlPoints, 50, true);
    
    let hasConstrainedPoints = false;
    if (pdgaMode) {
      controlPoints.forEach(p => {
        if (p.isConstrained) hasConstrainedPoints = true;
      });
    }
    
    if (bezierPoints.length > 0) {
      ctx.strokeStyle = hasConstrainedPoints ? '#FF8700' : '#8294A1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      bezierPoints.forEach((p, i) => {
        const cp = toCanvas(p);
        if (i === 0) ctx.moveTo(cp.x, cp.y);
        else ctx.lineTo(cp.x, cp.y);
      });
      ctx.closePath();
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(130, 148, 161, 0.05)';
      ctx.fill();
    }
    
    controlPoints.forEach((point, index) => {
      const cp = toCanvas(point);
      const isHovered = hoveredPoint === index;
      const isSelected = selectedIndices.has(index);
      const isAnchor = point.type === 'anchor';
      
      let fillColor;
      if (editMode === 'delete' && isAnchor && isHovered) {
        fillColor = '#FF4444';
      } else if (isAnchor) {
        fillColor = isHovered ? '#FF8700' : isSelected ? '#FF8700' : '#8294A1';
      } else {
        fillColor = isHovered ? '#FF8700' : isSelected ? '#FF8700' : 'rgba(130, 148, 161, 0.6)';
      }
      
      ctx.fillStyle = fillColor;
      
      ctx.beginPath();
      if (isAnchor) {
        ctx.arc(cp.x, cp.y, isHovered ? 10 : 8, 0, Math.PI * 2);
      } else {
        const size = isHovered ? 7 : 5;
        ctx.rect(cp.x - size, cp.y - size, size * 2, size * 2);
      }
      ctx.fill();
      
      if (isSelected && !isHovered) {
        ctx.strokeStyle = '#FF8700';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        if (isAnchor) {
          ctx.arc(cp.x, cp.y, 12, 0, Math.PI * 2);
        } else {
          ctx.rect(cp.x - 8, cp.y - 8, 16, 16);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      if (point.isConstrained) {
        ctx.strokeStyle = '#FF8700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    if (marqueeStart !== null && marqueeEnd !== null) {
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minY = Math.min(marqueeStart.y, marqueeEnd.y);
      const maxY = Math.max(marqueeStart.y, marqueeEnd.y);
      ctx.strokeStyle = 'rgba(130, 148, 161, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }
    
    const anchors = getAnchors(controlPoints);
    ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`Anchors: ${anchors.length}`, 20, 30);
    
    if (editMode === 'add') {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.7)';
      ctx.fillText('ADD MODE: Click on canvas to add point', 20, 50);
    } else if (editMode === 'delete') {
      ctx.fillStyle = 'rgba(255, 68, 68, 0.7)';
      ctx.fillText('DELETE MODE: Click anchor point (circle) to remove', 20, 50);
    }
    
    ctx.fillStyle = 'rgba(130, 148, 161, 0.5)';
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, width - 100, 30);
    
  }, [controlPoints, hoveredPoint, selectedIndices, marqueeStart, marqueeEnd, pdgaMode, toCanvas, editMode, offsetX, offsetY, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;
        canvas.width = width;
        canvas.height = height;
        setCanvasSize({ width, height });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (touch) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top
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

  const getIndicesInRect = (x1, y1, x2, y2) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const indices = new Set();
    controlPoints.forEach((point, i) => {
      const cp = toCanvas(point);
      if (cp.x >= minX && cp.x <= maxX && cp.y >= minY && cp.y <= maxY) {
        indices.add(i);
      }
    });
    return indices;
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: pos.x - panOffset.x, y: pos.y - panOffset.y });
      return;
    }
    
    const pointIndex = findPointAtPos(pos);
    
    if (editMode === 'add') {
      const worldPos = fromCanvas(pos.x, pos.y);
      const nearestAnchor = findNearestSegment(controlPoints, worldPos);
      const newPoints = addAnchorPoint(controlPoints, worldPos, nearestAnchor);
      setControlPoints(newPoints);
      if (setStatusMessage) {
        setStatusMessage("Anchor point added. Profile topology updated.");
      }
      return;
    }
    
    if (editMode === 'delete' && pointIndex !== null) {
      const point = controlPoints[pointIndex];
      if (point.type === 'anchor') {
        const anchors = getAnchors(controlPoints);
        if (anchors.length <= 3) {
          if (setStatusMessage) {
            setStatusMessage("Cannot delete. Minimum 3 anchor points required for closed shape.");
          }
          return;
        }
        const newPoints = deleteAnchorPoint(controlPoints, pointIndex);
        setControlPoints(newPoints);
        if (setStatusMessage) {
          setStatusMessage("Anchor point removed. Recalculating geometry...");
        }
      } else {
        if (setStatusMessage) {
          setStatusMessage("Can only delete anchor points (circles), not handles (squares).");
        }
      }
      return;
    }
    
    if (editMode === 'select') {
      if (pointIndex !== null) {
        if (selectedIndices.has(pointIndex)) {
          dragEndFiredRef.current = false;
          selectionDragStateRef.current = {
            startWorld: fromCanvas(pos.x, pos.y),
            pointsSnapshot: controlPoints.map(p => ({ ...p }))
          };
          setDragging('selection');
          onDragStart?.(controlPoints);
        } else {
          setSelectedIndices(new Set());
          dragEndFiredRef.current = false;
          setDragging(pointIndex);
          onDragStart?.(controlPoints);
        }
      } else {
        setMarqueeStart(pos);
        setMarqueeEnd(pos);
      }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    
    if (isPanning) {
      setPanOffset({
        x: pos.x - panStart.x,
        y: pos.y - panStart.y
      });
      return;
    }
    
    if (marqueeStart !== null) {
      setMarqueeEnd(pos);
      return;
    }
    
    if (dragging === 'selection' && editMode === 'select') {
      const state = selectionDragStateRef.current;
      if (!state) return;
      const delta = {
        x: fromCanvas(pos.x, pos.y).x - state.startWorld.x,
        y: fromCanvas(pos.x, pos.y).y - state.startWorld.y
      };
      setControlPoints((prev) => {
        const newPoints = prev.map((p, i) => {
          if (!selectedIndices.has(i)) return p;
          const snap = state.pointsSnapshot[i];
          const moved = { ...snap, x: snap.x + delta.x, y: snap.y + delta.y };
          if (pdgaMode) {
            const constrained = constrainPoint(moved, pdgaMode, prev);
            return { ...moved, ...constrained };
          }
          return moved;
        });
        return newPoints;
      });
      return;
    }
    
    if (typeof dragging === 'number' && dragging !== null && editMode === 'select') {
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
      return;
    }
    
    const pointIndex = findPointAtPos(pos);
    setHoveredPoint(pointIndex);
  };

  const handleMouseUp = () => {
    if (marqueeStart !== null && marqueeEnd !== null) {
      const dx = Math.abs(marqueeEnd.x - marqueeStart.x);
      const dy = Math.abs(marqueeEnd.y - marqueeStart.y);
      if (dx < 5 && dy < 5) {
        setSelectedIndices(new Set());
      } else {
        const indices = getIndicesInRect(marqueeStart.x, marqueeStart.y, marqueeEnd.x, marqueeEnd.y);
        setSelectedIndices(indices);
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    if (dragging !== null && !dragEndFiredRef.current) {
      dragEndFiredRef.current = true;
      onDragEnd?.();
    }
    if (dragging === 'selection') {
      selectionDragStateRef.current = null;
    }
    setDragging(null);
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    if (marqueeStart !== null) {
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    if (dragging !== null && !dragEndFiredRef.current) {
      dragEndFiredRef.current = true;
      onDragEnd?.();
    }
    if (dragging === 'selection') {
      selectionDragStateRef.current = null;
    }
    setDragging(null);
    setHoveredPoint(null);
    setIsPanning(false);
  };

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (marqueeStart !== null) return 'crosshair';
    if (dragging === 'selection') return 'grabbing';
    if (editMode === 'add') return 'crosshair';
    if (editMode === 'delete') {
      if (hoveredPoint !== null && controlPoints[hoveredPoint]?.type === 'anchor') {
        return 'pointer';
      }
      return 'not-allowed';
    }
    if (hoveredPoint !== null) return 'grab';
    return 'default';
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
    const newZoom = Math.min(Math.max(zoom + delta, 0.25), 5);
    setZoom(newZoom);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 2) {
      const dist = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      setTouchState({
        lastTouchDist: dist,
        lastTouchCenter: center,
        activeTouches: 2
      });
      setIsPanning(true);
      return;
    }
    
    if (touches.length === 1) {
      const pos = getTouchPos(touches[0]);
      const pointIndex = findPointAtPos(pos);
      
      setTouchState({
        lastTouchDist: null,
        lastTouchCenter: null,
        activeTouches: 1
      });
      
      if (editMode === 'add') {
        const worldPos = fromCanvas(pos.x, pos.y);
        const nearestAnchor = findNearestSegment(controlPoints, worldPos);
        const newPoints = addAnchorPoint(controlPoints, worldPos, nearestAnchor);
        setControlPoints(newPoints);
        if (setStatusMessage) {
          setStatusMessage("Anchor point added. Profile topology updated.");
        }
        return;
      }
      
      if (editMode === 'delete' && pointIndex !== null) {
        const point = controlPoints[pointIndex];
        if (point.type === 'anchor') {
          const anchors = getAnchors(controlPoints);
          if (anchors.length <= 3) {
            if (setStatusMessage) {
              setStatusMessage("Cannot delete. Minimum 3 anchor points required for closed shape.");
            }
            return;
          }
          const newPoints = deleteAnchorPoint(controlPoints, pointIndex);
          setControlPoints(newPoints);
          if (setStatusMessage) {
            setStatusMessage("Anchor point removed. Recalculating geometry...");
          }
        } else {
          if (setStatusMessage) {
            setStatusMessage("Can only delete anchor points (circles), not handles (squares).");
          }
        }
        return;
      }
      
      if (editMode === 'select' && pointIndex !== null) {
        dragEndFiredRef.current = false;
        setDragging(pointIndex);
        setHoveredPoint(pointIndex);
        onDragStart?.(controlPoints);
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 2 && touchState.lastTouchDist !== null) {
      const newDist = getTouchDistance(touches);
      const newCenter = getTouchCenter(touches);
      
      const zoomDelta = (newDist - touchState.lastTouchDist) * 0.005;
      const newZoom = Math.min(Math.max(zoom + zoomDelta, 0.25), 5);
      setZoom(newZoom);
      
      if (touchState.lastTouchCenter) {
        const dx = newCenter.x - touchState.lastTouchCenter.x;
        const dy = newCenter.y - touchState.lastTouchCenter.y;
        setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy
        });
      }
      
      setTouchState({
        lastTouchDist: newDist,
        lastTouchCenter: newCenter,
        activeTouches: 2
      });
      return;
    }
    
    if (touches.length === 1 && dragging !== null && editMode === 'select') {
      const pos = getTouchPos(touches[0]);
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
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      if (dragging !== null && !dragEndFiredRef.current) {
        dragEndFiredRef.current = true;
        onDragEnd?.();
      }
      setDragging(null);
      setHoveredPoint(null);
      setIsPanning(false);
      setTouchState({
        lastTouchDist: null,
        lastTouchCenter: null,
        activeTouches: 0
      });
    } else if (e.touches.length === 1) {
      setTouchState({
        lastTouchDist: null,
        lastTouchCenter: null,
        activeTouches: 1
      });
    }
  };

  return (
    <div className="canvas-2d-wrapper">
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: getCursor(),
          touchAction: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onAuxClick={(e) => e.preventDefault()}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
}
