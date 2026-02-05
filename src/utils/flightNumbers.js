export function calculateFlightNumbers(controlPoints) {
  if (!controlPoints || controlPoints.length < 3) {
    return { speed: 0, glide: 0, turn: 0, fade: 0 };
  }

  const anchors = controlPoints.filter(p => p.type === 'anchor');
  const controls = controlPoints.filter(p => p.type === 'control');
  
  const metrics = analyzeProfile(anchors, controls);
  
  const speed = calculateSpeed(metrics);
  const glide = calculateGlide(metrics);
  const turn = calculateTurn(metrics);
  const fade = calculateFade(metrics);
  
  return {
    speed: roundToQuarter(speed),
    glide: roundToQuarter(glide),
    turn: roundToQuarter(turn),
    fade: roundToQuarter(fade)
  };
}

function roundToQuarter(value) {
  const rounded = Math.round(value * 4) / 4;
  return Math.round(rounded * 100) / 100;
}

function analyzeProfile(anchors, controls) {
  const allPoints = [...anchors, ...controls];
  
  if (allPoints.length === 0) {
    return {
      width: 0, height: 0, rimDepth: 0.5, domeHeight: 0.5,
      edgeSharpness: 0.5, profileSmoothness: 0.5, overallArea: 0.5,
      asymmetry: 0, anchorCount: 0, controlCount: 0,
      widthHeightRatio: 1, rimCurvature: 0.5, domeShape: 0.5
    };
  }
  
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  
  const rimPoints = anchors.filter(p => p.x > maxX - width * 0.35);
  const domePoints = anchors.filter(p => p.x < maxX - width * 0.35);
  
  const rimDepth = calculateRimDepthRaw(rimPoints, height);
  const domeHeight = calculateDomeHeightRaw(domePoints, height);
  const edgeSharpness = calculateEdgeSharpnessRaw(controls, anchors);
  const profileSmoothness = calculateSmoothnessRaw(anchors);
  const overallArea = estimateAreaNormalized(anchors, width, height);
  const asymmetry = calculateAsymmetry(anchors, (minY + maxY) / 2);
  const widthHeightRatio = width / height;
  const rimCurvature = calculateRimCurvature(rimPoints, controls.filter(c => c.x > maxX - width * 0.35));
  const domeShape = calculateDomeShape(domePoints);
  
  return {
    width,
    height,
    rimDepth,
    domeHeight,
    edgeSharpness,
    profileSmoothness,
    overallArea,
    asymmetry,
    widthHeightRatio,
    rimCurvature,
    domeShape,
    anchorCount: anchors.length,
    controlCount: controls.length
  };
}

function calculateRimDepthRaw(rimPoints, totalHeight) {
  if (rimPoints.length < 2) return 0.5;
  const rimYs = rimPoints.map(p => p.y);
  const rimRange = Math.max(...rimYs) - Math.min(...rimYs);
  return Math.min(rimRange / totalHeight, 1);
}

function calculateDomeHeightRaw(domePoints, totalHeight) {
  if (domePoints.length < 1) return 0.5;
  const domeYs = domePoints.map(p => p.y);
  const domeRange = Math.max(...domeYs) - Math.min(...domeYs);
  return Math.min(domeRange / totalHeight, 1);
}

function calculateEdgeSharpnessRaw(controls, anchors) {
  if (controls.length < 2 || anchors.length < 2) return 0.5;
  let totalAngle = 0;
  let count = 0;
  
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const nearbyControls = controls.filter(c => 
      Math.abs(c.x - anchor.x) < 30 && Math.abs(c.y - anchor.y) < 30
    );
    for (const ctrl of nearbyControls) {
      const dx = ctrl.x - anchor.x;
      const dy = ctrl.y - anchor.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 1) {
        totalAngle += Math.abs(Math.atan2(dy, dx));
        count++;
      }
    }
  }
  return count > 0 ? Math.min(totalAngle / count / Math.PI, 1) : 0.5;
}

function calculateSmoothnessRaw(anchors) {
  if (anchors.length < 3) return 0.5;
  let totalCurvature = 0;
  const sorted = [...anchors].sort((a, b) => a.x - b.x);
  
  for (let i = 1; i < sorted.length - 1; i++) {
    const prev = sorted[i-1];
    const curr = sorted[i];
    const next = sorted[i+1];
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    totalCurvature += Math.abs(angle2 - angle1);
  }
  return Math.min(totalCurvature / (sorted.length - 2) / Math.PI, 1);
}

function estimateAreaNormalized(anchors, width, height) {
  const area = estimateArea(anchors);
  const maxArea = width * height;
  return maxArea > 0 ? Math.min(area / maxArea, 1) : 0.5;
}

function calculateRimCurvature(rimAnchors, rimControls) {
  if (rimAnchors.length < 2) return 0.5;
  let curvature = 0;
  for (const anchor of rimAnchors) {
    for (const ctrl of rimControls) {
      const dist = Math.sqrt(Math.pow(anchor.x - ctrl.x, 2) + Math.pow(anchor.y - ctrl.y, 2));
      curvature += dist;
    }
  }
  return Math.min(curvature / (rimAnchors.length * 50 + 1), 1);
}

function calculateDomeShape(domePoints) {
  if (domePoints.length < 2) return 0.5;
  const sorted = [...domePoints].sort((a, b) => a.x - b.x);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const midY = (first.y + last.y) / 2;
  let deviation = 0;
  for (const p of sorted) {
    deviation += Math.abs(p.y - midY);
  }
  return Math.min(deviation / (sorted.length * 20 + 1), 1);
}

function estimateArea(anchors) {
  if (anchors.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < anchors.length; i++) {
    const j = (i + 1) % anchors.length;
    area += anchors[i].x * anchors[j].y;
    area -= anchors[j].x * anchors[i].y;
  }
  
  return Math.abs(area) / 2;
}

function calculateAsymmetry(anchors, centerY) {
  const topPoints = anchors.filter(p => p.y < centerY);
  const bottomPoints = anchors.filter(p => p.y >= centerY);
  
  const topArea = topPoints.reduce((sum, p) => sum + Math.abs(p.y - centerY), 0);
  const bottomArea = bottomPoints.reduce((sum, p) => sum + Math.abs(p.y - centerY), 0);
  
  if (topArea + bottomArea === 0) return 0;
  return (topArea - bottomArea) / (topArea + bottomArea);
}

function calculateSpeed(metrics) {
  const baseSpeed = 6;
  
  const widthFactor = Math.min(metrics.widthHeightRatio * 0.8, 4);
  const areaFactor = metrics.overallArea * 3;
  const smoothnessFactor = (1 - metrics.profileSmoothness) * 2;
  
  let speed = baseSpeed + 
    widthFactor + 
    areaFactor + 
    smoothnessFactor;
  
  speed += metrics.rimCurvature * 1.5;
  speed -= metrics.domeShape * 0.8;
  
  return Math.max(1, Math.min(14.75, speed));
}

function calculateGlide(metrics) {
  const baseGlide = 3;
  
  const domeFactor = metrics.domeHeight * 3;
  const smoothnessFactor = (1 - metrics.profileSmoothness) * 2;
  const areaFactor = metrics.overallArea * 1.5;
  
  let glide = baseGlide + 
    domeFactor + 
    smoothnessFactor + 
    areaFactor;
  
  glide -= metrics.rimDepth * 1.5;
  glide += metrics.domeShape * 1.2;
  
  return Math.max(1, Math.min(7, glide));
}

function calculateTurn(metrics) {
  const baseTurn = 0;
  
  const rimFactor = metrics.rimDepth * 3;
  const curvatureFactor = metrics.rimCurvature * 2;
  const asymmetryFactor = metrics.asymmetry * 4;
  
  let turn = baseTurn - 
    rimFactor - 
    curvatureFactor + 
    asymmetryFactor;
  
  turn -= metrics.edgeSharpness * 2;
  turn += metrics.domeShape * 0.5;
  
  return Math.max(-5, Math.min(1, turn));
}

function calculateFade(metrics) {
  const baseFade = 1;
  
  const rimFactor = metrics.rimDepth * 3;
  const curvatureFactor = metrics.rimCurvature * 2;
  const sharpnessFactor = metrics.edgeSharpness * 2;
  
  let fade = baseFade + 
    rimFactor + 
    curvatureFactor + 
    sharpnessFactor;
  
  fade -= metrics.domeHeight * 1.5;
  fade -= metrics.asymmetry * 0.5;
  
  return Math.max(0, Math.min(5, fade));
}

export function simulateFlightPath(flightNumbers, throwPower = 1) {
  const { speed, glide, turn, fade } = flightNumbers;
  const points = [];
  
  const totalDistance = (speed * 25 + glide * 15) * throwPower;
  const maxHeight = glide * 8 * throwPower;
  
  const turnPhaseEnd = 0.6;
  const fadePhaseStart = 0.65;
  
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    const x = t * totalDistance;
    
    let y = 0;
    if (t < turnPhaseEnd) {
      const turnProgress = t / turnPhaseEnd;
      y = turn * 15 * Math.pow(turnProgress, 1.5) * throwPower;
    } else {
      const turnY = turn * 15 * throwPower;
      const fadeProgress = (t - fadePhaseStart) / (1 - fadePhaseStart);
      const fadeAmount = fade * 20 * Math.pow(Math.max(0, fadeProgress), 2) * throwPower;
      y = turnY - fadeAmount;
    }
    
    let z = 0;
    if (t < 0.3) {
      z = maxHeight * (t / 0.3);
    } else if (t < 0.7) {
      z = maxHeight;
    } else {
      const descentProgress = (t - 0.7) / 0.3;
      z = maxHeight * (1 - Math.pow(descentProgress, 1.5));
    }
    
    const velocityFactor = 1 - (t * 0.6);
    const rotation = 360 * 8 * t * velocityFactor;
    
    points.push({
      x,
      y,
      z: Math.max(0, z),
      t,
      rotation,
      velocity: velocityFactor
    });
  }
  
  return points;
}
