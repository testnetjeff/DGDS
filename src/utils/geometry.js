import * as THREE from 'three';
import { generateBezierPoints } from './bezier';

export function createLatheGeometry(controlPoints, segments = 64, resolution = 'medium', closed = true) {
  const resolutionMap = {
    low: { radialSegments: 24, curveSegments: 20 },
    medium: { radialSegments: 48, curveSegments: 40 },
    high: { radialSegments: 96, curveSegments: 80 },
  };

  const { radialSegments, curveSegments } = resolutionMap[resolution];
  const bezierPoints = generateBezierPoints(controlPoints, curveSegments, closed);

  if (bezierPoints.length < 2) throw new Error('Not enough points for geometry');

  const pts = bezierPoints.map(p => ({ x: Math.max(0, p.x), y: -p.y }));
  const n = pts.length;

  const minX = Math.min(...pts.map(p => p.x));
  const axisThreshold = minX + 1.0;

  let topIdx = 0, topBest = -Infinity;
  let botIdx = 0, botBest = Infinity;
  pts.forEach((p, i) => {
    if (p.x <= axisThreshold) {
      if (p.y > topBest) { topBest = p.y; topIdx = i; }
      if (p.y < botBest) { botBest = p.y; botIdx = i; }
    }
  });

  const extractArc = (fromIdx, toIdx, dir) => {
    const arc = [];
    let i = fromIdx;
    let guard = 0;
    while (i !== toIdx && guard < n + 1) {
      arc.push(pts[i]);
      i = (i + dir + n) % n;
      guard++;
    }
    arc.push(pts[toIdx]);
    return arc;
  };

  const arc1 = extractArc(topIdx, botIdx, 1);
  const arc2 = extractArc(topIdx, botIdx, -1);
  const maxX1 = Math.max(...arc1.map(p => p.x));
  const maxX2 = Math.max(...arc2.map(p => p.x));
  const outerArc = maxX1 >= maxX2 ? arc1 : arc2;

  outerArc[0] = { x: 0, y: outerArc[0].y };
  outerArc[outerArc.length - 1] = { x: 0, y: outerArc[outerArc.length - 1].y };

  const profilePoints = outerArc.map(p => new THREE.Vector2(p.x, p.y));

  const geometry = new THREE.LatheGeometry(profilePoints, radialSegments, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function geometryToSTL(geometry) {
  const vertices = geometry.attributes.position;
  const indices = geometry.index;

  const getVertex = (i) => ({
    x: vertices.getX(i),
    y: vertices.getY(i),
    z: vertices.getZ(i),
  });

  const calcNormal = (v1, v2, v3) => {
    const ux = v2.x - v1.x, uy = v2.y - v1.y, uz = v2.z - v1.z;
    const vx = v3.x - v1.x, vy = v3.y - v1.y, vz = v3.z - v1.z;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return len === 0 ? { x: 0, y: 1, z: 0 } : { x: nx / len, y: ny / len, z: nz / len };
  };

  const numTriangles = indices ? indices.count / 3 : vertices.count / 3;
  let triangles = '';

  for (let i = 0; i < numTriangles; i++) {
    const i1 = indices ? indices.getX(i * 3)     : i * 3;
    const i2 = indices ? indices.getX(i * 3 + 1) : i * 3 + 1;
    const i3 = indices ? indices.getX(i * 3 + 2) : i * 3 + 2;
    const v1 = getVertex(i1), v2 = getVertex(i2), v3 = getVertex(i3);
    const n = calcNormal(v1, v2, v3);
    triangles += `  facet normal ${n.x} ${n.y} ${n.z}\n    outer loop\n`;
    triangles += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
    triangles += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
    triangles += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
    triangles += `    endloop\n  endfacet\n`;
  }

  return `solid disc\n${triangles}endsolid disc`;
}

export function downloadSTL(geometry, filename = 'disc_design.stl') {
  const stlContent = geometryToSTL(geometry);
  const blob = new Blob([stlContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
