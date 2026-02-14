export function calculateLiftCoefficient(controlPoints, angleOfAttack = 0) {
  const steps = [];
  
  steps.push({ type: 'header', text: 'THIN AIRFOIL THEORY ANALYSIS' });
  steps.push({ type: 'divider' });
  
  const anchors = controlPoints.filter(p => p.type === 'anchor');
  const controls = controlPoints.filter(p => p.type === 'control');
  
  if (anchors.length < 3) {
    steps.push({ type: 'error', text: 'ERROR: Insufficient anchor points for analysis' });
    return { cl: 0, steps, error: true };
  }
  
  steps.push({ type: 'info', text: `Analyzing profile with ${anchors.length} anchor points...` });
  steps.push({ type: 'code', text: `const anchors = profileData.filter(p => p.type === 'anchor');` });
  steps.push({ type: 'result', text: `  → Found ${anchors.length} anchors, ${controls.length} control handles` });
  
  const allPoints = [...anchors].sort((a, b) => a.x - b.x);
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  const chordLength = maxX - minX;
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'CHORD LINE CALCULATION' });
  steps.push({ type: 'code', text: `const chordLength = maxX - minX;` });
  steps.push({ type: 'calc', text: `c = ${maxX.toFixed(2)} - ${minX.toFixed(2)}` });
  steps.push({ type: 'result', text: `  → Chord length (c) = ${chordLength.toFixed(3)} units` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'SURFACE SAMPLING' });
  steps.push({ type: 'info', text: 'Sampling profile at discrete stations...' });
  
  const numStations = 30;
  const topSurface = [];
  const bottomSurface = [];
  
  for (let i = 0; i <= numStations; i++) {
    const x = minX + (chordLength * i) / numStations;
    const nearbyPoints = allPoints.filter(p => Math.abs(p.x - x) < chordLength * 0.15);
    
    if (nearbyPoints.length > 0) {
      const sortedByY = [...nearbyPoints].sort((a, b) => a.y - b.y);
      const topPoint = sortedByY[0];
      const bottomPoint = sortedByY[sortedByY.length - 1];
      
      topSurface.push({ x, y: topPoint.y });
      if (sortedByY.length > 1) {
        bottomSurface.push({ x, y: bottomPoint.y });
      } else {
        bottomSurface.push({ x, y: topPoint.y });
      }
    }
  }
  
  steps.push({ type: 'code', text: `for (let i = 0; i <= ${numStations}; i++) {` });
  steps.push({ type: 'code', text: `  sampleSurfaceAt(x = minX + c * i / ${numStations});` });
  steps.push({ type: 'code', text: `}` });
  steps.push({ type: 'result', text: `  → Top surface: ${topSurface.length} stations sampled` });
  steps.push({ type: 'result', text: `  → Bottom surface: ${bottomSurface.length} stations sampled` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'CAMBER LINE COMPUTATION' });
  steps.push({ type: 'info', text: 'Computing mean camber line z(x) = (z_upper + z_lower) / 2' });
  
  const camberLine = [];
  for (let i = 0; i < Math.min(topSurface.length, bottomSurface.length); i++) {
    const x = topSurface[i].x;
    const camberY = (topSurface[i].y + bottomSurface[i].y) / 2;
    camberLine.push({ x, y: camberY });
  }
  camberLine.reverse();
  
  steps.push({ type: 'code', text: `camberLine[i] = { x, y: (z_top + z_bottom) / 2 }` });
  steps.push({ type: 'result', text: `  → Generated ${camberLine.length} camber line stations` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'CAMBER LINE SLOPE INTEGRATION' });
  steps.push({ type: 'info', text: 'Using Glauert transform: x/c = ½(1 - cos θ), θ ∈ [0,π]' });
  steps.push({ type: 'formula', text: 'α₀ = (1/π) ∫₀^π (dz/dx)(1 - cos θ) dθ  (positive camber → α₀ < 0)' });
  
  let integralSum = 0;
  
  for (let i = 1; i < camberLine.length; i++) {
    const dx = camberLine[i].x - camberLine[i-1].x;
    const dz = camberLine[i].y - camberLine[i-1].y;
    
    if (Math.abs(dx) > 0.001) {
      const dzdx = dz / dx;
      const xNormPrev = (maxX - camberLine[i - 1].x) / chordLength;
      const xNormCurr = (maxX - camberLine[i].x) / chordLength;
      const thetaPrev = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * xNormPrev)));
      const thetaCurr = Math.acos(Math.max(-1, Math.min(1, 1 - 2 * xNormCurr)));
      const dTheta = thetaCurr - thetaPrev;
      const thetaMid = (thetaPrev + thetaCurr) / 2;
      const weight = 1 - Math.cos(thetaMid);
      integralSum += dzdx * weight * dTheta;
    }
  }
  
  const alphaZeroLiftRad = -integralSum / Math.PI;
  
  steps.push({ type: 'code', text: `let integralSum = 0;` });
  steps.push({ type: 'code', text: `for (let i = 1; i < camberLine.length; i++) {` });
  steps.push({ type: 'code', text: `  const dzdx = (z[i] - z[i-1]) / (x[i] - x[i-1]);` });
  steps.push({ type: 'code', text: `  const weight = 1 - cos(θ); integralSum += dzdx * weight * dθ;` });
  steps.push({ type: 'code', text: `}` });
  steps.push({ type: 'code', text: `const alpha_0 = -integralSum / Math.PI;  // z positive up vs y positive down` });
  steps.push({ type: 'calc', text: `∫(dz/dx)dθ = ${integralSum.toFixed(6)}` });
  steps.push({ type: 'result', text: `  → α₀ = ${(alphaZeroLiftRad * 180 / Math.PI).toFixed(4)}°` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'MAXIMUM CAMBER ANALYSIS' });
  
  const leadingY = camberLine[0]?.y || 0;
  const trailingY = camberLine[camberLine.length - 1]?.y || 0;
  const chordSlope = chordLength > 0 ? (trailingY - leadingY) / chordLength : 0;
  
  let maxCamber = 0;
  let maxCamberX = minX;
  
  for (const point of camberLine) {
    const chordY = leadingY + chordSlope * (point.x - minX);
    const camber = Math.abs(point.y - chordY);
    if (camber > maxCamber) {
      maxCamber = camber;
      maxCamberX = point.x;
    }
  }
  
  const maxCamberPosition = chordLength > 0 ? (maxCamberX - minX) / chordLength : 0;
  const camberRatio = chordLength > 0 ? maxCamber / chordLength : 0;
  
  steps.push({ type: 'calc', text: `h_max = ${maxCamber.toFixed(4)} units` });
  steps.push({ type: 'calc', text: `x_camber = ${(maxCamberPosition * 100).toFixed(1)}% chord` });
  steps.push({ type: 'result', text: `  → Max camber (h) = ${maxCamber.toFixed(4)}` });
  steps.push({ type: 'result', text: `  → Camber ratio (h/c) = ${(camberRatio * 100).toFixed(3)}%` });
  
  let alphaZeroLiftRadFinal = alphaZeroLiftRad;
  if (camberRatio > 0.01 && alphaZeroLiftRad > 0) {
    alphaZeroLiftRadFinal = -alphaZeroLiftRad;
  }
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'LIFT CURVE SLOPE' });
  steps.push({ type: 'info', text: 'For thin airfoil: dCₗ/dα = 2π per radian' });
  
  const a0 = 2 * Math.PI;
  steps.push({ type: 'code', text: `const a0 = 2 * Math.PI;` });
  steps.push({ type: 'calc', text: `a₀ = 2π = ${a0.toFixed(4)} rad⁻¹` });
  steps.push({ type: 'calc', text: `a₀ = ${(a0 * Math.PI / 180).toFixed(4)} deg⁻¹` });
  
  const alphaRad = angleOfAttack * Math.PI / 180;
  steps.push({ type: 'divider' });
  steps.push({ type: 'code', text: `// Angle of attack input` });
  steps.push({ type: 'calc', text: `α = ${angleOfAttack.toFixed(1)}° = ${alphaRad.toFixed(4)} rad` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'LIFT COEFFICIENT COMPUTATION' });
  steps.push({ type: 'formula', text: 'Cₗ = a₀ × (α - α₀)' });
  
  const cl = a0 * (alphaRad - alphaZeroLiftRadFinal);
  
  steps.push({ type: 'code', text: `const Cl = a0 * (alpha - alpha_0);` });
  steps.push({ type: 'calc', text: `Cₗ = ${a0.toFixed(4)} × (${alphaRad.toFixed(4)} - (${alphaZeroLiftRadFinal.toFixed(4)}))` });
  steps.push({ type: 'calc', text: `Cₗ = ${a0.toFixed(4)} × ${(alphaRad - alphaZeroLiftRadFinal).toFixed(4)}` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'final', text: `LIFT COEFFICIENT (Cₗ) = ${cl.toFixed(4)}` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'AERODYNAMIC PARAMETERS' });
  
  const liftCurveSlope = a0 * (180 / Math.PI);
  steps.push({ type: 'result', text: `  → Lift curve slope = ${liftCurveSlope.toFixed(4)} per degree` });
  
  const xcp = 0.25;
  steps.push({ type: 'result', text: `  → Center of pressure = ${(xcp * 100).toFixed(1)}% chord (thin airfoil)` });
  
  const thicknessRatio = (maxY - minY) / chordLength;
  steps.push({ type: 'result', text: `  → Thickness ratio (t/c) = ${(thicknessRatio * 100).toFixed(2)}%` });
  
  steps.push({ type: 'divider' });
  steps.push({ type: 'success', text: 'Thin airfoil analysis complete.' });
  
  return {
    cl,
    camberRatio,
    maxCamberPosition,
    chordLength,
    alphaZeroLift: alphaZeroLiftRadFinal * 180 / Math.PI,
    liftCurveSlope,
    centerOfPressure: xcp,
    thicknessRatio,
    steps,
    error: false
  };
}
