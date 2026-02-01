import * as THREE from 'three';
import { generateBezierPoints } from './bezier';

export function createLatheGeometry(controlPoints, segments = 64, resolution = 'medium') {
  const resolutionMap = {
    low: { radialSegments: 24, curveSegments: 20 },
    medium: { radialSegments: 48, curveSegments: 40 },
    high: { radialSegments: 96, curveSegments: 80 }
  };
  
  const { radialSegments, curveSegments } = resolutionMap[resolution];
  
  const bezierPoints = generateBezierPoints(controlPoints, curveSegments);
  
  const profilePoints = bezierPoints.map(p => new THREE.Vector2(p.x, -p.y));
  
  const geometry = new THREE.LatheGeometry(profilePoints, radialSegments, 0, Math.PI * 2);
  geometry.computeVertexNormals();
  
  return geometry;
}

export function geometryToSTL(geometry) {
  const vertices = geometry.attributes.position;
  const indices = geometry.index;
  
  let triangles = '';
  
  const getVertex = (index) => {
    return {
      x: vertices.getX(index),
      y: vertices.getY(index),
      z: vertices.getZ(index)
    };
  };
  
  const calculateNormal = (v1, v2, v3) => {
    const u = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const v = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
    
    return {
      x: u.y * v.z - u.z * v.y,
      y: u.z * v.x - u.x * v.z,
      z: u.x * v.y - u.y * v.x
    };
  };
  
  const numTriangles = indices ? indices.count / 3 : vertices.count / 3;
  
  for (let i = 0; i < numTriangles; i++) {
    let i1, i2, i3;
    
    if (indices) {
      i1 = indices.getX(i * 3);
      i2 = indices.getX(i * 3 + 1);
      i3 = indices.getX(i * 3 + 2);
    } else {
      i1 = i * 3;
      i2 = i * 3 + 1;
      i3 = i * 3 + 2;
    }
    
    const v1 = getVertex(i1);
    const v2 = getVertex(i2);
    const v3 = getVertex(i3);
    const normal = calculateNormal(v1, v2, v3);
    
    triangles += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
    triangles += `    outer loop\n`;
    triangles += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
    triangles += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
    triangles += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
    triangles += `    endloop\n`;
    triangles += `  endfacet\n`;
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
