import { useMemo } from "react";
import type { Terrain } from "../utils/api";
import type { Marker, Overlay } from "../utils/overlay";
import { Html, Line } from "@react-three/drei";

type Props = {
  data: Terrain;
  overlay: Overlay;
  exaggeration: number;
};

export function Overlay3D({ data, overlay, exaggeration }: Props) {
  const side = data.sideM;
  const lift = side * 0.003; // flotte
  const toY = (alt: number) => (alt - data.zMin) * exaggeration + lift;

  const linePoints = useMemo(
    () =>
      overlay.track?.points.map(({x, z, alt}): [number, number, number] => [
        x,
        (alt - data.zMin) * exaggeration + lift,
        z,
      ]),
    [overlay.track, data.zMin, exaggeration, lift],
  );

  return (
    <>
      {linePoints && <Line points={linePoints} color="#e53935" lineWidth={3} />}
      {overlay.markers.map((m, i) => (
        <MarkerPin
          key={`${m.kind}-${i}`}
          marker={m}
          y={toY(m.alt)}
          side={side}
        />
      ))}
    </>
  );
}

type PinProps = { marker: Marker; y: number; side: number };

function MarkerPin({ marker, y, side }: PinProps) {
  const r = side * 0.006; // rayon du rond
  const h = side * 0.05; // hauteur du trait jusqu'à l'étiquette
  const stem: [number, number, number][] = [
    [0, 0, 0],
    [0, h, 0],
  ];

  return (
    <group position={[marker.x, y, marker.z]}>
      <mesh position={[0, r, 0]}>
        <sphereGeometry args={[r, 16, 16]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <Line points={stem} color="white" lineWidth={1} />
      <Html position={[0, h, 0]} center pointerEvents="none">
        <div
          style={{
            background: "white",
            color: "#111",
            padding: "3px 8px",
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          <strong>{marker.label}</strong>
          <br />
          {Math.round(marker.alt).toLocaleString("fr-FR")} m
        </div>
      </Html>
    </group>
  );
}
