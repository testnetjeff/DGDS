import React, { useEffect, useRef, useState } from 'react';
import './LdRevealOverlay.css';

const TERMINAL_WIDTH = 600;
const TERMINAL_HEIGHT = 480;
const Y_TOP = 80;
const Y_BOTTOM = Y_TOP + TERMINAL_HEIGHT;

export default function LdRevealOverlay({ onRevealComplete }) {
  const path1Ref = useRef(null);
  const path2Ref = useRef(null);
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  }));

  useEffect(() => {
    const onResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const w = dimensions.width;
  const clBottomX = 10 + TERMINAL_WIDTH / 2;
  const clBottomY = Y_BOTTOM;
  const cdBottomX = w / 2;
  const cdBottomY = Y_BOTTOM;
  const ldLeft = Math.max(10, w - 610);
  const ldRight = ldLeft + TERMINAL_WIDTH;
  const ldTop = Y_TOP;
  const ldBottom = Y_BOTTOM;

  const path1D = `M ${clBottomX} ${clBottomY} L ${ldLeft} ${ldTop} L ${ldRight} ${ldTop} L ${ldRight} ${ldBottom}`;
  const path2D = `M ${cdBottomX} ${cdBottomY} L ${ldRight} ${ldBottom} L ${ldLeft} ${ldBottom} L ${ldLeft} ${ldTop}`;

  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;

  useEffect(() => {
    const path1 = path1Ref.current;
    const path2 = path2Ref.current;
    if (!path1 || !path2) return;

    const len1 = path1.getTotalLength();
    const len2 = path2.getTotalLength();
    path1.style.strokeDasharray = len1;
    path2.style.strokeDasharray = len2;
    path1.style.strokeDashoffset = len1;
    path2.style.strokeDashoffset = len2;

    const duration = 1000;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 1.5);
      path1.style.strokeDashoffset = len1 * (1 - easeOut);
      path2.style.strokeDashoffset = len2 * (1 - easeOut);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        onRevealCompleteRef.current?.();
      }
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="ld-reveal-overlay" aria-hidden="true">
      <svg
        className="ld-reveal-svg"
        width={w}
        height={dimensions.height}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <defs>
          <filter id="ld-reveal-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          ref={path1Ref}
          d={path1D}
          className="ld-reveal-path"
          fill="none"
          strokeWidth="2.5"
          filter="url(#ld-reveal-glow)"
        />
        <path
          ref={path2Ref}
          d={path2D}
          className="ld-reveal-path"
          fill="none"
          strokeWidth="2.5"
          filter="url(#ld-reveal-glow)"
        />
      </svg>
    </div>
  );
}
