const PROJECT_VERSION = 1;

export function serializeProject({ designName, controlPoints, pdgaMode, resolution, discColor }) {
  return JSON.stringify({
    version: PROJECT_VERSION,
    designName: designName || 'Untitled Disc',
    controlPoints: controlPoints || [],
    pdgaMode: !!pdgaMode,
    resolution: resolution || 'medium',
    discColor: discColor || 'hsl(200, 100%, 50%)'
  }, null, 2);
}

export function deserializeProject(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (_) {
    return { error: 'Invalid JSON' };
  }
  if (!data || typeof data !== 'object') {
    return { error: 'Invalid project format' };
  }
  if (!Array.isArray(data.controlPoints) || data.controlPoints.length < 3) {
    return { error: 'Invalid or insufficient control points' };
  }
  const anchors = data.controlPoints.filter(p => p && p.type === 'anchor');
  if (anchors.length < 3) {
    return { error: 'At least 3 anchor points required' };
  }
  return {
    designName: typeof data.designName === 'string' ? data.designName : 'Untitled Disc',
    controlPoints: data.controlPoints,
    pdgaMode: !!data.pdgaMode,
    resolution: ['low', 'medium', 'high'].includes(data.resolution) ? data.resolution : 'medium',
    discColor: typeof data.discColor === 'string' ? data.discColor : 'hsl(200, 100%, 50%)'
  };
}

export function downloadProject(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'design.dgds';
  a.click();
  URL.revokeObjectURL(url);
}
