export function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

export function generateBezierPoints(controlPoints, segments = 50) {
  const points = [];
  
  for (let i = 0; i < controlPoints.length - 1; i += 3) {
    const p0 = controlPoints[i];
    const p1 = controlPoints[i + 1] || p0;
    const p2 = controlPoints[i + 2] || p1;
    const p3 = controlPoints[i + 3] || p2;
    
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      points.push(cubicBezier(p0, p1, p2, p3, t));
    }
  }
  
  return points;
}

export function getDefaultDiscProfile() {
  return [
    { x: 0, y: 0, type: 'anchor' },
    { x: 20, y: -5, type: 'control' },
    { x: 40, y: -10, type: 'control' },
    { x: 60, y: -12, type: 'anchor' },
    { x: 80, y: -14, type: 'control' },
    { x: 100, y: -10, type: 'control' },
    { x: 105, y: 0, type: 'anchor' },
    { x: 108, y: 8, type: 'control' },
    { x: 106, y: 15, type: 'control' },
    { x: 100, y: 18, type: 'anchor' },
    { x: 94, y: 20, type: 'control' },
    { x: 88, y: 20, type: 'control' },
    { x: 85, y: 18, type: 'anchor' },
  ];
}

export function getReferenceDiscProfile() {
  return [
    { x: 0, y: 0 },
    { x: 30, y: -8 },
    { x: 70, y: -13 },
    { x: 100, y: -10 },
    { x: 107, y: 5 },
    { x: 105, y: 15 },
    { x: 95, y: 20 },
    { x: 85, y: 18 },
  ];
}
