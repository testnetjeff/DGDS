import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generateBezierPoints } from './bezier';

const DEFAULT_TEXT_SIZE = 12;
const DEFAULT_TEXT_DEPTH = 2;
const TEXT_MAX_CHARS = 20;
const BUCKET_SIZE = 0.5;

function buildTopSurfaceHeightMap(latheGeometry) {
  const pos = latheGeometry.attributes.position;
  const buckets = new Map();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    const bucket = Math.round(r / BUCKET_SIZE);
    if (!buckets.has(bucket) || y > buckets.get(bucket).y) {
      buckets.set(bucket, { r: bucket * BUCKET_SIZE, y });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.r - b.r);
}

function getHeightAtRadius(r, heightMap) {
  if (!heightMap || heightMap.length === 0) return 0;
  if (r <= heightMap[0].r) return heightMap[0].y;
  if (r >= heightMap[heightMap.length - 1].r) return heightMap[heightMap.length - 1].y;
  for (let i = 0; i < heightMap.length - 1; i++) {
    const a = heightMap[i];
    const b = heightMap[i + 1];
    if (r >= a.r && r <= b.r) {
      const t = (b.r - a.r < 0.0001) ? 0 : (r - a.r) / (b.r - a.r);
      return a.y + t * (b.y - a.y);
    }
  }
  return heightMap[heightMap.length - 1].y;
}

function conformTextToSurface(textGeometry, heightMap, discTopY) {
  const pos = textGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    const surfaceY = getHeightAtRadius(r, heightMap);
    const offset = surfaceY - discTopY;
    pos.setY(i, pos.getY(i) + offset);
  }
  pos.needsUpdate = true;
  textGeometry.computeVertexNormals();
  textGeometry.computeBoundingBox();
}

export function createTextGeometry(designName, font, options = {}) {
  const name = (designName || '').trim();
  if (!name || !font) return null;
  const text = name.length > TEXT_MAX_CHARS ? name.slice(0, TEXT_MAX_CHARS) : name;
  try {
    const size = options.size ?? DEFAULT_TEXT_SIZE;
    const depth = options.depth ?? DEFAULT_TEXT_DEPTH;
    const geo = new TextGeometry(text, {
      font,
      size,
      depth,
      curveSegments: 6,
      bevelEnabled: false,
    });
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  } catch (e) {
    console.warn('createTextGeometry failed:', e);
    return null;
  }
}

export function createDiscGeometryWithText(controlPoints, segments = 64, resolution = 'medium', closed = true, designName, font, textOptions = {}) {
  const discGeometry = createLatheGeometry(controlPoints, segments, resolution, closed);
  const name = (designName || '').trim();

  if (!font || !name) {
    return { disc: discGeometry, text: null, combined: discGeometry };
  }

  const protrusion = textOptions.depth ?? DEFAULT_TEXT_DEPTH;
  const FIXED_EMBED = 1.0;
  const totalDepth = protrusion + FIXED_EMBED;

  const textGeometry = createTextGeometry(designName, font, {
    size: textOptions.size ?? DEFAULT_TEXT_SIZE,
    depth: totalDepth,
  });

  if (!textGeometry) {
    return { disc: discGeometry, text: null, combined: discGeometry };
  }

  textGeometry.computeBoundingBox();
  const textMinY = textGeometry.boundingBox.min.y;

  const heightMap = buildTopSurfaceHeightMap(discGeometry);
  const centerSurfaceY = getHeightAtRadius(0, heightMap);
  const translateY = centerSurfaceY - textMinY - FIXED_EMBED;
  textGeometry.translate(0, translateY, 0);

  conformTextToSurface(textGeometry, heightMap, centerSurfaceY);

  let combined = discGeometry;
  try {
    const discNI = discGeometry.clone().toNonIndexed();
    const textNI = textGeometry.clone().toNonIndexed();
    discNI.deleteAttribute('uv');
    textNI.deleteAttribute('uv');
    const merged = mergeGeometries([discNI, textNI]);
    if (merged) {
      merged.computeVertexNormals();
      combined = merged;
    }
  } catch (e) {
    console.warn('mergeGeometries failed:', e);
  }

  return { disc: discGeometry, text: textGeometry, combined };
}

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
