import { useCylinder, usePlane } from "@react-three/cannon";
import * as THREE from "three";

export function Chamber() {
  const radius = 2;
  const height = 4;

  // Bottom boundary
  usePlane(() => ({
    position: [0, -height / 2, 0],
    rotation: [-Math.PI / 2, 0, 0],
  }));

  // Top boundary
  usePlane(() => ({
    position: [0, height / 2, 0],
    rotation: [Math.PI / 2, 0, 0],
  }));

  // Side walls (approximation using multiple planes or a cylinder body)
  // For simplicity and performance, we'll use a cylinder collider for the walls
  // Note: Cannon's cylinder is along Z axis by default, we need to rotate it
  // Actually, use multiple planes for a hexagonal or circular wall approximation is better for "hollow" interiors in Cannon
  
  const segments = 12;
  const angle = (Math.PI * 2) / segments;
  
  return (
    <group>
      {/* Visual Cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius, radius, height, 64, 1, true]} />
        <meshPhysicalMaterial
          roughness={0}
          transmission={0.9}
          thickness={0.1}
          transparent
          opacity={0.3}
          color="#ffffff"
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Actual physics walls */}
      {Array.from({ length: segments }).map((_, i) => {
        const theta = i * angle;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        return (
          <Wall
            key={i}
            position={[x, 0, z]}
            rotation={[0, -theta + Math.PI / 2, 0]}
          />
        );
      })}

      {/* Decorative Base */}
      <mesh position={[0, -height / 2 - 0.1, 0]}>
        <cylinderGeometry args={[radius + 0.2, radius + 0.2, 0.2, 32]} />
        <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Wall({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  usePlane(() => ({
    position,
    rotation: [rotation[0], rotation[1] + Math.PI, rotation[2]], // Face inward
  }));
  return null;
}
