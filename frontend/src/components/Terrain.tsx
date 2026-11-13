import { useMemo } from "react";
import * as THREE from "three";
import type { Terrain } from "../utils/api.ts";
import { useLoader } from "@react-three/fiber";

const LOW = new THREE.Color("#4a7c3a");
const MID = new THREE.Color("#8a7f72");
const HIGH = new THREE.Color("#ffffff");

function altitudeColor(t: number, out: THREE.Color) {
  if (t < 0.55) out.copy(LOW).lerp(MID, t / 0.55);
  else out.copy(MID).lerp(HIGH, (t - 0.55) / 0.45);
}

export function Terrain({
  data,
  exaggeration,
}: {
  data: Terrain;
  exaggeration: number;
}) {
  const texture = useLoader(THREE.TextureLoader, data.orthoUrl);
  const geometry = useMemo(() => {
    const { n, sideM, zMin, zMax, heights } = data;
    const g = new THREE.PlaneGeometry(sideM, sideM, n - 1, n - 1);
    g.rotateX(-Math.PI / 2);

    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const range = zMax - zMin || 1;

    for (let i = 0; i < pos.count; i++) {
      const h = heights[i] < -1000 ? zMin : heights[i]; // pas de donnée -> on met le point bas
      pos.setY(i, h - zMin); // le bloc part de 0
      altitudeColor((h - zMin) / range, c);
      c.toArray(colors, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();

    return g;
  }, [data]);

  return (
    <mesh geometry={geometry} scale={[1, exaggeration, 1]}>
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
