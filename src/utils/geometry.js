import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generateBezierPoints } from './bezier';

const TEXT_SIZE = 12;
const TEXT_DEPTH = 1.2;
const TEXT_MAX_CHARS = 20;
const TEXT_RAISE_OFFSET = 1.5;

export function createTextGeometry(designName, font, options = {}) {
  const name = (designName || '').trim();
  if (!name || !font) return null;
  const text = name.length > TEXT_MAX_CHARS ? name.slice(0, TEXT_MAX_CHARS) : name;
  try {
    const size = options.size ?? TEXT_SIZE;
    const depth = options.depth ?? TEXT_DEPTH;
    const curveSegments = options.curveSegments ?? 8;
    const geo = new TextGeometry(text, {
      font,
      size,
      depth,
      curveSegments,
      bevelEnabled: false,
    });
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    geo.rotateX(-Math.PI / 2);
    if (!geo.index) {
      const vertexCount = geo.attributes.position.count;
      const indices = new Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) indices[i] = i;
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    }
    return geo;
  } catch (e) {
    console.warn('createTextGeometry failed:', e);
    return null;
  }
}

export function createDiscGeometryWithText(controlPoints, segments = 64, resolution = 'medium', closed = true, designName, font) {
  const latheGeometry = createLatheGeometry(controlPoints, segments, resolution, closed);
  const name = (designName || '').trim();
  if (!font || !name) return latheGeometry;
  const textGeometry = createTextGeometry(designName, font);
  if (!textGeometry) return latheGeometry;
  latheGeometry.computeBoundingBox();
  const discTopY = latheGeometry.boundingBox.max.y;
  textGeometry.translate(0, discTopY + TEXT_RAISE_OFFSET, 0);
  const merged = mergeGeometries([latheGeometry, textGeometry]);
  if (!merged) {
    console.warn('mergeGeometries failed (text not added); disc only.');
    return latheGeometry;
  }
  merged.computeVertexNormals();
  return merged;
}

export function createLatheGeometry(controlPoints, segments = 64, resolution = 'medium', closed = true) {
  const resolutionMap = {
    low: { radialSegments: 24, curveSegments: 20 },
    medium: { radialSegments: 48, curveSegments: 40 },
    high: { radialSegments: 96, curveSegments: 80 }
  };
  
  const { radialSegments, curveSegments } = resolutionMap[resolution];
  
  const bezierPoints = generateBezierPoints(controlPoints, curveSegments, closed);
  
  if (bezierPoints.length < 2) {
    throw new Error('Not enough points for geometry');
  }
  
  const profilePoints = bezierPoints.map(p => new THREE.Vector2(Math.max(0, p.x), -p.y));
  
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
    
    const nx = u.y * v.z - u.z * v.y;
    const ny = u.z * v.x - u.x * v.z;
    const nz = u.x * v.y - u.y * v.x;
    
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len === 0) return { x: 0, y: 1, z: 0 };
    
    return { x: nx / len, y: ny / len, z: nz / len };
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
