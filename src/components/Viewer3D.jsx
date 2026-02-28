import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { createDiscGeometryWithText } from '../utils/geometry';

function DiscMesh({ discGeometry, textGeometry, color }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const discMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      reflectivity: 0.5,
      envMapIntensity: 1.0,
    });
  }, [color]);

  const textMaterial = useMemo(() => {
    const hsl = {};
    new THREE.Color(color).getHSL(hsl);
    const textColor = new THREE.Color().setHSL(hsl.h, hsl.s * 0.5, Math.min(hsl.l * 1.8, 0.95));
    return new THREE.MeshPhysicalMaterial({
      color: textColor,
      metalness: 0.3,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.8,
      envMapIntensity: 1.2,
    });
  }, [color]);

  return (
    <group ref={groupRef}>
      <mesh geometry={discGeometry} material={discMaterial} castShadow receiveShadow />
      {textGeometry && (
        <mesh geometry={textGeometry} material={textMaterial} castShadow receiveShadow />
      )}
    </group>
  );
}

function Scene({ discGeometry, textGeometry, color }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 20, 0]} intensity={0.5} />
      
      <DiscMesh discGeometry={discGeometry} textGeometry={textGeometry} color={color} />
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={100}
        maxDistance={500}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        }}
      />
      <Environment preset="studio" />
    </>
  );
}

export default function Viewer3D({ controlPoints, color, resolution, designName = '', font = null, textSize = 12, textDepth = 2 }) {
  const result = useMemo(() => {
    if (!controlPoints || controlPoints.length < 4) return null;
    try {
      return createDiscGeometryWithText(controlPoints, 64, resolution, true, designName, font, { size: textSize, depth: textDepth });
    } catch (e) {
      console.error('Geometry error:', e);
      return null;
    }
  }, [controlPoints, resolution, designName, font, textSize, textDepth]);

  if (!result) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        AWAITING GEOMETRY DATA...
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [150, 100, 150], fov: 50 }}
      style={{ background: '#0a0a0a' }}
      shadows
    >
      <Scene discGeometry={result.disc} textGeometry={result.text} color={color} />
    </Canvas>
  );
}
