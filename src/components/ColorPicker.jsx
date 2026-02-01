import React, { useRef, useState, useEffect, useCallback } from 'react';
import './ColorPicker.css';

export default function ColorPicker({ color, setColor }) {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const h = (x / width) * 360;
        const s = 100;
        const l = 100 - (y / height) * 100;
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    const cursorX = (hue / 360) * width;
    const cursorY = ((100 - lightness) / 100) * height;
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, 9, 0, Math.PI * 2);
    ctx.stroke();
  }, [hue, lightness]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    setColor(newColor);
  }, [hue, saturation, lightness, setColor]);

  const updateFromMouse = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));
    
    setHue((x / canvas.width) * 360);
    setLightness(100 - (y / canvas.height) * 100);
    setSaturation(100);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateFromMouse(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      updateFromMouse(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="color-picker-container">
      <div className="color-picker-label mono">COLOR SELECTION</div>
      <canvas
        ref={canvasRef}
        width={200}
        height={120}
        className="color-picker-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
