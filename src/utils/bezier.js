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

export function getAnchors(controlPoints) {
  return controlPoints
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter(p => p.type === 'anchor');
}

export function generateBezierPoints(controlPoints, segments = 50, closed = true) {
  const points = [];
  const anchors = getAnchors(controlPoints);
  const numAnchors = anchors.length;
  
  if (numAnchors < 2) return points;
  
  for (let i = 0; i < numAnchors; i++) {
    const nextI = closed ? (i + 1) % numAnchors : i + 1;
    if (!closed && nextI >= numAnchors) break;
    
    const anchor1 = anchors[i];
    const anchor2 = anchors[nextI];
    
    const idx1 = anchor1.originalIndex;
    const idx2 = anchor2.originalIndex;
    
    let h1 = { x: anchor1.x, y: anchor1.y };
    let h2 = { x: anchor2.x, y: anchor2.y };
    
    const handleAfter1 = controlPoints[idx1 + 1];
    if (handleAfter1?.type === 'control') {
      h1 = handleAfter1;
    }
    
    if (closed && nextI === 0) {
      const handleBefore2 = controlPoints[idx2 - 1];
      if (handleBefore2?.type === 'control') {
        h2 = handleBefore2;
      } else {
        const lastControl = controlPoints.filter(p => p.type === 'control').pop();
        if (lastControl) {
          h2 = lastControl;
        }
      }
    } else {
      const handleBefore2 = controlPoints[idx2 - 1];
      if (handleBefore2?.type === 'control') {
        h2 = handleBefore2;
      }
    }
    
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      points.push(cubicBezier(anchor1, h1, h2, anchor2, t));
    }
  }
  
  return points;
}

export function getDefaultDiscProfile() {
  return [
    { x: -8, y: 0, type: 'control', id: 0 },
    { x: 0, y: 0, type: 'anchor', id: 1 },
    { x: 30, y: -8, type: 'control', id: 2 },
    { x: 45, y: -15, type: 'control', id: 3 },
    { x: 55, y: -17, type: 'anchor', id: 4 },
    { x: 80, y: -17, type: 'control', id: 5 },
    { x: 100, y: -10, type: 'control', id: 6 },
    { x: 107, y: 0, type: 'anchor', id: 7 },
    { x: 115, y: 12, type: 'control', id: 8 },
    { x: 107, y: 22, type: 'control', id: 9 },
    { x: 95, y: 25, type: 'anchor', id: 10 },
    { x: 65, y: 25, type: 'control', id: 11 },
    { x: 30, y: 18, type: 'control', id: 12 },
    { x: 15, y: 10, type: 'anchor', id: 13 },
    { x: 0, y: 5, type: 'control', id: 14 },
  ];
}

export function getReferenceDiscProfile() {
  return [
    { x: 0, y: 0 },
    { x: 50, y: -15 },
    { x: 100, y: -10 },
    { x: 107, y: 5 },
    { x: 100, y: 20 },
    { x: 50, y: 15 },
    { x: 0, y: 5 },
    { x: 0, y: 0 },
  ];
}

let nextId = 100;
function getNextId() {
  return nextId++;
}

export function addAnchorPoint(controlPoints, position, nearestAnchorIdx) {
  const newPoints = [...controlPoints];
  const anchors = getAnchors(controlPoints);
  
  if (anchors.length === 0) {
    return [
      { x: position.x, y: position.y, type: 'anchor', id: getNextId() },
      { x: position.x + 15, y: position.y, type: 'control', id: getNextId() },
    ];
  }
  
  let anchorArrayIdx = 0;
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i].originalIndex >= nearestAnchorIdx) {
      anchorArrayIdx = i;
      break;
    }
    anchorArrayIdx = i;
  }
  
  const currentAnchor = anchors[anchorArrayIdx];
  let insertIdx = currentAnchor.originalIndex + 1;
  
  while (insertIdx < newPoints.length && newPoints[insertIdx].type === 'control') {
    insertIdx++;
  }
  
  const handleIn = {
    x: position.x - 12,
    y: position.y,
    type: 'control',
    id: getNextId()
  };
  
  const newAnchor = {
    x: position.x,
    y: position.y,
    type: 'anchor',
    id: getNextId()
  };
  
  const handleOut = {
    x: position.x + 12,
    y: position.y,
    type: 'control',
    id: getNextId()
  };
  
  newPoints.splice(insertIdx, 0, handleIn, newAnchor, handleOut);
  
  return newPoints;
}

export function deleteAnchorPoint(controlPoints, anchorIndex) {
  const point = controlPoints[anchorIndex];
  if (point.type !== 'anchor') return controlPoints;
  
  const anchors = getAnchors(controlPoints);
  if (anchors.length <= 3) return controlPoints;
  
  const firstAnchorIdx = anchors[0].originalIndex;
  if (anchorIndex === firstAnchorIdx && controlPoints[0]?.type === 'control') {
    const result = [...controlPoints];
    result.splice(0, 1);
    return deleteAnchorPointInternal(result, anchorIndex - 1);
  }
  
  return deleteAnchorPointInternal(controlPoints, anchorIndex);
}

function deleteAnchorPointInternal(controlPoints, anchorIndex) {
  const newPoints = [...controlPoints];
  
  let deleteStart = anchorIndex;
  let deleteEnd = anchorIndex;
  
  if (anchorIndex > 0 && newPoints[anchorIndex - 1]?.type === 'control') {
    deleteStart = anchorIndex - 1;
  }
  
  if (anchorIndex < newPoints.length - 1 && newPoints[anchorIndex + 1]?.type === 'control') {
    deleteEnd = anchorIndex + 1;
  }
  
  newPoints.splice(deleteStart, deleteEnd - deleteStart + 1);
  
  return newPoints;
}

export function findNearestSegment(controlPoints, position) {
  const anchors = getAnchors(controlPoints);
  if (anchors.length === 0) return 0;
  
  let minDist = Infinity;
  let nearestIdx = 0;
  
  for (let i = 0; i < anchors.length; i++) {
    const a1 = anchors[i];
    const a2 = anchors[(i + 1) % anchors.length];
    
    const midX = (a1.x + a2.x) / 2;
    const midY = (a1.y + a2.y) / 2;
    
    const dist = Math.sqrt((position.x - midX) ** 2 + (position.y - midY) ** 2);
    
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = a1.originalIndex;
    }
  }
  
  return nearestIdx;
}
