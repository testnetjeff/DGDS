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

  const profilePoints = bezierPoints.map(p => new THREE.Vector2(Math.max(0, p.x), -p.y));
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
