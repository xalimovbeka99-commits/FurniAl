"use client";

/**
 * /builder — the customization page.
 * Left tool panel | 3D viewport | Right tool panel.
 * The hardcoded models are gone; the centre renders whatever the config says.
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import StructurePanel from "@/components/builder/StructurePanel";
import AppearancePanel from "@/components/builder/AppearancePanel";
import FurnitureModel from "@/components/builder/FurnitureModel";
import { useFurnitureStore } from "@/store/furnitureStore";

export default function BuilderPage() {
  const config = useFurnitureStore((s) => s.config);
  const selectModule = useFurnitureStore((s) => s.selectModule);

  return (
    <div className="flex h-screen w-full bg-neutral-100">
      <StructurePanel />

      <main className="relative flex-1">
        <Canvas
          shadows
          camera={{ position: [2.6, 1.9, 3.2], fov: 45 }}
          onPointerMissed={() => selectModule(null)}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
          <Environment preset="apartment" />
          <Grid args={[20, 20]} cellColor="#ddd" sectionColor="#bbb" infiniteGrid fadeDistance={18} position={[0, 0, 0]} />

          {/* recenter vertically so the piece sits nicely in frame */}
          <group position={[0, -config.dimensions.height / 2, 0]}>
            <FurnitureModel />
          </group>

          <OrbitControls makeDefault target={[0, 0, 0]} minDistance={1.2} maxDistance={9} />
        </Canvas>

        <div className="pointer-events-none absolute left-4 top-4 rounded bg-white/80 px-3 py-1.5 text-xs text-neutral-600 backdrop-blur">
          Click a door or drawer to edit that section · drag to orbit
        </div>
      </main>

      <AppearancePanel />
    </div>
  );
}
