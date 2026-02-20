import React from 'react';
import './TemplateHintOverlay.css';

const TEMPLATE_HINT_CONTENT = {
  putter: {
    title: 'Putter (Putt & Approach)',
    bullets: [
      'Deep dish, tall profile — the bulkiest of the three.',
      'Narrow blunt rim (~0.9–1.2 cm), rounded outer edge.',
      'High drag, low speed — flies straight at low velocity, resists skipping.',
      'Built for accuracy and chain-grabbing.',
      'Often thrown at max weight (170–175 g) for stability and momentum.',
    ],
  },
  mid: {
    title: 'Mid-Range',
    bullets: [
      'Shallower than a putter, with enough depth for good glide.',
      'Moderate rim (~1.2–1.5 cm), beveled but relatively dull.',
      'Versatile — holds release angle and relies on glide for distance.',
      'The multi-tool when in doubt.',
      'Often max weight (up to 180 g) for stable, predictable flight.',
    ],
  },
  driver: {
    title: 'Driver (Fairway & Distance)',
    bullets: [
      'Very shallow, streamlined — slices through the air.',
      'Wide to aggressively wide rim (1.6–2.5+ cm), sharp bevel.',
      'Needs arm speed and spin to generate lift; slow throws dump hard.',
      'Built for distance (and locating deep brush).',
      'Weight often 150–175 g — lighter for speed, heavier for wind.',
    ],
  },
};

export default function TemplateHintOverlay({ templateType, onClose }) {
  const content = TEMPLATE_HINT_CONTENT[templateType];
  if (!content) return null;

  return (
    <div className="template-hint-overlay">
      <div className="template-hint-modal">
        <div className="template-hint-header mono">{content.title}</div>
        <ul className="template-hint-bullets">
          {content.bullets.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
        <button type="button" className="template-hint-btn mono" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
