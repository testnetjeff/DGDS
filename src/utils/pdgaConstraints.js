export const PDGA_LIMITS = {
  maxDiameter: 215,
  minDiameter: 210,
  maxHeight: 30,
  minHeight: 10,
  maxRimDepth: 25,
  minRimDepth: 10,
  maxRimWidth: 30,
  minRimWidth: 5,
  maxWeight: 200,
};

export function constrainPoint(point, pdgaEnabled, allPoints) {
  if (!pdgaEnabled) return { ...point, isConstrained: false };
  
  let constrained = { ...point };
  let isConstrained = false;
  
  if (constrained.x < 0) {
    constrained.x = 0;
    isConstrained = true;
  }
  if (constrained.x > PDGA_LIMITS.maxDiameter / 2) {
    constrained.x = PDGA_LIMITS.maxDiameter / 2;
    isConstrained = true;
  }
  
  if (constrained.y < -PDGA_LIMITS.maxHeight) {
    constrained.y = -PDGA_LIMITS.maxHeight;
    isConstrained = true;
  }
  if (constrained.y > PDGA_LIMITS.maxRimDepth) {
    constrained.y = PDGA_LIMITS.maxRimDepth;
    isConstrained = true;
  }
  
  return { ...constrained, isConstrained };
}

export function validateProfile(points) {
  const warnings = [];
  
  const maxX = Math.max(...points.map(p => p.x));
  const diameter = maxX * 2;
  
  if (diameter > PDGA_LIMITS.maxDiameter) {
    warnings.push(`Diameter ${diameter.toFixed(1)}mm exceeds PDGA max of ${PDGA_LIMITS.maxDiameter}mm`);
  }
  
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const height = maxY - minY;
  
  if (height > PDGA_LIMITS.maxHeight) {
    warnings.push(`Height ${height.toFixed(1)}mm exceeds PDGA max of ${PDGA_LIMITS.maxHeight}mm`);
  }
  
  return warnings;
}
