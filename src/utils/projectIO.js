const PROJECT_VERSION = 1;

const VALID_DISC_TEMPLATES = ['putter', 'mid', 'driver'];

export function serializeProject({ designName, controlPoints, pdgaMode, resolution, discColor, discTemplate }) {
  const payload = {
    version: PROJECT_VERSION,
    designName: designName || 'Untitled Disc',
    controlPoints: controlPoints || [],
    pdgaMode: !!pdgaMode,
    resolution: resolution || 'medium',
    discColor: discColor || 'hsl(200, 100%, 50%)'
  };
  if (discTemplate && VALID_DISC_TEMPLATES.includes(discTemplate)) {
    payload.discTemplate = discTemplate;
  }
  return JSON.stringify(payload, null, 2);
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
  const discTemplate = VALID_DISC_TEMPLATES.includes(data.discTemplate) ? data.discTemplate : 'mid';
  return {
    designName: typeof data.designName === 'string' ? data.designName : 'Untitled Disc',
    controlPoints: data.controlPoints,
    pdgaMode: !!data.pdgaMode,
    resolution: ['low', 'medium', 'high'].includes(data.resolution) ? data.resolution : 'medium',
    discColor: typeof data.discColor === 'string' ? data.discColor : 'hsl(200, 100%, 50%)',
    discTemplate
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
