import { Physics, useSphere } from "@react-three/cannon";
import { OrbitControls, PerspectiveCamera, Environment, Stars, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Chamber } from "./Chamber";
import * as THREE from "three";

type PhysicsSimProps = {
  ballCount: number;
  isRunning: boolean;
};

function BallWithWind({ id, number, position, color, isRunning }: any) {
  const [ref, api] = useSphere(() => ({
    mass: 0.1,
    position,
    args: [0.15],
    linearDamping: 0.4, // Increased to simulate air resistance (Drag)
    angularDamping: 0.4,
    material: {
      restitution: 0.9,
      friction: 0.01,
    },
  }));

  useFrame((state) => {
    if (isRunning) {
      const time = state.clock.getElapsedTime();
      
      // Get current position from API or state (simplified here with ref access if needed)
      // Since Cannon doesn't give us position easily inside useFrame without subs,
      // we'll apply a position-dependent force approximation.
      
      // Upward force + Noise
      // Reduced strength as requested (30-40% less than previous 1.3-1.5 range)
      const upwardBase = 0.85; 
      const upwardVariation = Math.sin(time * 0.8 + id) * 0.15;
      
      // Vortex Logic:
      // We apply a rotational force around the Y axis
      // And a slight inward/outward push based on time
      const rotSpeed = 0.8;
      const vortexX = Math.cos(time * rotSpeed + id * 0.1) * 0.4;
      const vortexZ = Math.sin(time * rotSpeed + id * 0.1) * 0.4;
      
      // Combined turbulence
      const noiseX = Math.sin(time * 2.5 + id) * 0.2;
      const noiseZ = Math.cos(time * 2.8 + id) * 0.2;
      
      api.applyForce(
        [vortexX + noiseX, upwardBase + upwardVariation, vortexZ + noiseZ], 
        [0, 0, 0]
      );
    }
  });

  return (
    <mesh ref={ref as any} castShadow>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.15} metalness={0.2} />
      <Text
        position={[0, 0, 0.155]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {number}
      </Text>
      <Text
        position={[0, 0, -0.155]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {number}
      </Text>
    </mesh>
  );
}

export function PhysicsSim({ ballCount, isRunning }: PhysicsSimProps) {
  const balls = useMemo(() => {
    return Array.from({ length: ballCount }).map((_, i) => ({
      id: i,
      number: i + 1,
      position: [
        (Math.random() - 0.5) * 1.5,
        -1.5 + Math.random() * 3,
        (Math.random() - 0.5) * 1.5,
      ] as [number, number, number],
      color: `hsl(${(i * 137.5) % 360}, 75%, 60%)`, // Golden ratio distribution for distinct colors
    }));
  }, [ballCount]);

  return (
    <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 1, 7]} fov={45} />
          <OrbitControls 
            enablePan={false} 
            maxDistance={12} 
            minDistance={4}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 3}
          />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 5, 0]} intensity={1.5} castShadow />
          <spotLight 
            position={[10, 10, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={1.5} 
            castShadow 
          />
          
          <Environment preset="night" />
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

          <Physics gravity={[0, -9.81, 0]} iterations={10}>
            <Chamber />
            {balls.map((ball) => (
              <BallWithWind key={ball.id} {...ball} isRunning={isRunning} />
            ))}
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
