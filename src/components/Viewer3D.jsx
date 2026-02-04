import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { createLatheGeometry } from '../utils/geometry';

function DiscMesh({ geometry, color }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const material = useMemo(() => {
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

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
  );
}

function Scene({ geometry, color }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 20, 0]} intensity={0.5} />
      
      <DiscMesh geometry={geometry} color={color} />
      
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

export default function Viewer3D({ controlPoints, color, resolution }) {
  const geometry = useMemo(() => {
    if (!controlPoints || controlPoints.length < 4) return null;
    try {
      return createLatheGeometry(controlPoints, 64, resolution);
    } catch (e) {
      console.error('Geometry error:', e);
      return null;
    }
  }, [controlPoints, resolution]);

  if (!geometry) {
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
      <Scene geometry={geometry} color={color} />
    </Canvas>
  );
}
