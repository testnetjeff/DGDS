const NU_AIR = 1.5e-5;
const FORM_DRAG_K = 0.7;

export function calculateDragCoefficient(controlPoints, speedMS = 25) {
  const steps = [];

  steps.push({ type: 'header', text: 'APPROXIMATE DRAG COEFFICIENT ANALYSIS' });
  steps.push({ type: 'divider' });
  steps.push({ type: 'info', text: 'Assumptions: smooth surface, incompressible air (ν ≈ 1.5e-5 m²/s), speed = 25 m/s (typical throw). Cd is approximate; actual drag depends on surface finish and flight conditions.' });
  steps.push({ type: 'divider' });

  const anchors = controlPoints.filter(p => p.type === 'anchor');
  const controls = controlPoints.filter(p => p.type === 'control');

  if (anchors.length < 3) {
    steps.push({ type: 'error', text: 'ERROR: Insufficient anchor points for analysis' });
    return { cd: 0, cdFriction: 0, cdForm: 0, re: 0, chordLength: 0, thicknessRatio: 0, steps, error: true };
  }

  steps.push({ type: 'info', text: `Analyzing profile with ${anchors.length} anchor points...` });
  steps.push({ type: 'code', text: `const anchors = profileData.filter(p => p.type === 'anchor');` });
  steps.push({ type: 'result', text: `  → Found ${anchors.length} anchors, ${controls.length} control handles` });

  const allPoints = [...anchors].sort((a, b) => a.x - b.x);
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  const chordLengthMm = maxX - minX;
  const thicknessMm = maxY - minY;

  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'CHORD AND THICKNESS' });
  steps.push({ type: 'code', text: `const chordLength = maxX - minX;` });
  steps.push({ type: 'calc', text: `c = ${maxX.toFixed(2)} - ${minX.toFixed(2)} = ${chordLengthMm.toFixed(3)} mm` });
  steps.push({ type: 'code', text: `const thickness = maxY - minY;` });
  steps.push({ type: 'calc', text: `t = ${maxY.toFixed(2)} - ${minY.toFixed(2)} = ${thicknessMm.toFixed(3)} mm` });
  const thicknessRatio = chordLengthMm > 0 ? thicknessMm / chordLengthMm : 0;
  steps.push({ type: 'result', text: `  → Chord (c) = ${chordLengthMm.toFixed(3)} mm` });
  steps.push({ type: 'result', text: `  → Thickness ratio (t/c) = ${(thicknessRatio * 100).toFixed(2)}%` });

  const chordM = chordLengthMm / 1000;
  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'REYNOLDS NUMBER' });
  steps.push({ type: 'formula', text: 'Re = V × c / ν' });
  steps.push({ type: 'code', text: `const Re = (speedMS * chordM) / NU_AIR;` });
  const re = (speedMS * chordM) / NU_AIR;
  steps.push({ type: 'calc', text: `Re = ${speedMS} × ${chordM.toFixed(6)} / ${NU_AIR}` });
  steps.push({ type: 'result', text: `  → Re = ${re.toFixed(0)}` });

  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'SKIN FRICTION DRAG' });
  steps.push({ type: 'info', text: 'Turbulent flat-plate: Cf = 0.0592 × Re^(-0.2); Cd_friction ≈ 2×Cf (both sides)' });
  steps.push({ type: 'formula', text: 'Cd_friction = 2 × 0.0592 × Re^(-0.2)' });
  const cdFriction = 2 * 0.0592 * Math.pow(re, -0.2);
  steps.push({ type: 'code', text: `const Cd_friction = 2 * 0.0592 * Math.pow(Re, -0.2);` });
  steps.push({ type: 'calc', text: `Cd_friction = ${cdFriction.toFixed(6)}` });
  steps.push({ type: 'result', text: `  → Cd_friction = ${cdFriction.toFixed(4)}` });

  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'FORM DRAG' });
  steps.push({ type: 'info', text: `Correlation: Cd_form = k × (t/c)², k = ${FORM_DRAG_K}` });
  steps.push({ type: 'formula', text: 'Cd_form = k × (t/c)²' });
  const cdForm = FORM_DRAG_K * (thicknessRatio * thicknessRatio);
  steps.push({ type: 'code', text: `const Cd_form = k * (thicknessRatio ** 2);` });
  steps.push({ type: 'calc', text: `Cd_form = ${FORM_DRAG_K} × (${thicknessRatio.toFixed(4)})² = ${cdForm.toFixed(6)}` });
  steps.push({ type: 'result', text: `  → Cd_form = ${cdForm.toFixed(4)}` });

  steps.push({ type: 'divider' });
  steps.push({ type: 'header', text: 'TOTAL DRAG COEFFICIENT' });
  steps.push({ type: 'formula', text: 'Cd = Cd_friction + Cd_form' });
  const cd = cdFriction + cdForm;
  steps.push({ type: 'code', text: `const Cd = Cd_friction + Cd_form;` });
  steps.push({ type: 'calc', text: `Cd = ${cdFriction.toFixed(4)} + ${cdForm.toFixed(4)}` });
  steps.push({ type: 'final', text: `DRAG COEFFICIENT (Cd) = ${cd.toFixed(4)}` });

  steps.push({ type: 'divider' });
  steps.push({ type: 'success', text: 'Approximate drag analysis complete.' });

  return {
    cd,
    cdFriction,
    cdForm,
    re,
    chordLength: chordLengthMm,
    thicknessRatio,
    steps,
    error: false
  };
}
