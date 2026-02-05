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
  
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  const sortedByX = [...anchors].sort((a, b) => a.x - b.x);
  const leftmostAnchor = sortedByX[0];
  const rightmostAnchor = sortedByX[sortedByX.length - 1];
  
  const rimPoints = anchors.filter(p => p.x > maxX - width * 0.3);
  const domePoints = anchors.filter(p => p.x < maxX - width * 0.3);
  
  const rimDepth = calculateRimDepth(rimPoints, minY, maxY);
  const domeHeight = calculateDomeHeight(domePoints, minY, height);
  const edgeSharpness = calculateEdgeSharpness(controls, anchors, width);
  const profileSmoothness = calculateSmoothness(controls, width);
  const overallArea = estimateArea(anchors) / (width * height + 1);
  const asymmetry = calculateAsymmetry(anchors, (minY + maxY) / 2);
  
  return {
    width,
    height,
    rimDepth,
    domeHeight,
    edgeSharpness,
    profileSmoothness,
    overallArea,
    asymmetry,
    anchorCount: anchors.length,
    controlCount: controls.length
  };
}

function calculateRimDepth(rimPoints, minY, maxY) {
  if (rimPoints.length < 2) return 0.5;
  
  const rimYs = rimPoints.map(p => p.y);
  const rimRange = Math.max(...rimYs) - Math.min(...rimYs);
  const totalRange = maxY - minY;
  
  return totalRange > 0 ? rimRange / totalRange : 0.5;
}

function calculateDomeHeight(domePoints, minY, totalHeight) {
  if (domePoints.length < 1) return 0.5;
  
  const topY = Math.min(...domePoints.map(p => p.y));
  const bottomY = Math.max(...domePoints.map(p => p.y));
  const rawHeight = Math.abs(bottomY - topY);
  
  return totalHeight > 0 ? rawHeight / totalHeight : 0.5;
}

function calculateEdgeSharpness(controls, anchors, profileWidth) {
  if (controls.length < 2 || profileWidth <= 0) return 0.5;
  
  let totalDeviation = 0;
  let count = 0;
  
  for (let i = 0; i < anchors.length && i < controls.length; i++) {
    const anchor = anchors[i];
    const control = controls[i];
    if (anchor && control) {
      const dist = Math.sqrt(
        Math.pow(anchor.x - control.x, 2) + 
        Math.pow(anchor.y - control.y, 2)
      );
      totalDeviation += dist / profileWidth;
      count++;
    }
  }
  
  return count > 0 ? totalDeviation / count : 0.5;
}

function calculateSmoothness(controls, profileWidth) {
  if (controls.length < 2 || profileWidth <= 0) return 1;
  
  let totalVariation = 0;
  for (let i = 1; i < controls.length; i++) {
    const prev = controls[i - 1];
    const curr = controls[i];
    const dist = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + 
      Math.pow(curr.y - prev.y, 2)
    );
    totalVariation += dist / profileWidth;
  }
  
  return totalVariation / controls.length;
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
  const baseSpeed = 7;
  
  const areaFactor = Math.min(metrics.overallArea * 8, 3);
  const smoothnessFactor = Math.min(metrics.profileSmoothness * 5, 2);
  const heightRatio = Math.min(metrics.height / Math.max(metrics.width, 1), 1);
  
  let speed = baseSpeed + 
    areaFactor + 
    smoothnessFactor - 
    heightRatio * 2;
  
  speed += (metrics.anchorCount * 0.18);
  speed += (metrics.controlCount * 0.11);
  
  return Math.max(1, Math.min(14.75, speed));
}

function calculateGlide(metrics) {
  const baseGlide = 3.5;
  
  const domeFactor = Math.min(metrics.domeHeight * 4, 2);
  const smoothnessFactor = Math.min(metrics.profileSmoothness * 3, 1.5);
  const sharpnessReduction = Math.min(metrics.edgeSharpness * 2, 1);
  
  let glide = baseGlide + 
    domeFactor + 
    smoothnessFactor - 
    sharpnessReduction;
  
  glide += (metrics.anchorCount * 0.13);
  glide -= metrics.rimDepth * 0.5;
  
  return Math.max(1, Math.min(7, glide));
}

function calculateTurn(metrics) {
  const baseTurn = -0.5;
  
  const rimFactor = metrics.rimDepth * 4;
  const asymmetryFactor = metrics.asymmetry * 3;
  const sharpnessFactor = metrics.edgeSharpness * 1.5;
  
  let turn = baseTurn - 
    rimFactor + 
    asymmetryFactor - 
    sharpnessFactor;
  
  turn += (metrics.anchorCount * 0.12);
  turn -= metrics.domeHeight * 0.8;
  
  return Math.max(-5, Math.min(1, turn));
}

function calculateFade(metrics) {
  const baseFade = 1.5;
  
  const rimFactor = metrics.rimDepth * 5;
  const sharpnessFactor = metrics.edgeSharpness * 1.2;
  const domeFactor = metrics.domeHeight * 0.8;
  
  let fade = baseFade + 
    rimFactor + 
    sharpnessFactor - 
    domeFactor;
  
  fade += (metrics.anchorCount * 0.14);
  fade += (metrics.controlCount * 0.07);
  
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
