import type { Terrain } from "./api";

export type Marker = {
  x: number;
  z: number;
  alt: number; // data from terrain
  ele?: number; // data from osm
  label: string;
  kind: "peak" | "start" | "end";
};

export type Track = {
  points: { x: number, z: number, alt: number }[];
  lengthM: number;
  isClipped: boolean,
  ascentM: number,
  descentM: number
};

export type Overlay = {
  markers: Marker[];
  track: Track | null;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function altitudeAt(data: Terrain, x: number, z: number): number {
  const { n, sideM, heights, zMin } = data;

  // position en "cases" de la grille : de 0 (bord nord/ouest) à n-1 (bord sud/est)
  const fx = clamp((x / sideM + 0.5) * (n - 1), 0, n - 1);
  const fz = clamp((z / sideM + 0.5) * (n - 1), 0, n - 1);

  const c0 = Math.floor(fx);
  const r0 = Math.floor(fz);
  const c1 = Math.min(c0 + 1, n - 1);
  const r1 = Math.min(r0 + 1, n - 1);
  const tx = fx - c0; // où on se situe entre deux colonnes (0 à 1)
  const tz = fz - r0;

  const h = (r: number, c: number) => {
    const v = heights[r * n + c];
    return v < -1000 ? zMin : v; // pas de donnée : on prend l'altitude minimale
  };

  // interpolation bilinéaire : moyenne pondérée des 4 cases voisines
  const top = h(r0, c0) * (1 - tx) + h(r0, c1) * tx;
  const bottom = h(r1, c0) * (1 - tx) + h(r1, c1) * tx;
  return top * (1 - tz) + bottom * tz;
}

// export function fakeOverlay(data: Terrain): Overlay {
//   const { n, sideM, heights } = data;
//
//   // Tracé en zigzag, de l'ouest vers l'est
//   const COUNT = 400; // assez de points pour que la ligne suive le relief (cases de ~45 m)
//   const points: [number, number, number][] = [];
//   for (let i = 0; i < COUNT; i++) {
//     const t = i / (COUNT - 1); // de 0 à 1 le long du tracé
//     const u = 0.2 + 0.6 * t;
//     const v = 0.75 - 0.5 * t + 0.08 * Math.sin(t * Math.PI * 6);
//     const x = (u - 0.5) * sideM;
//     const z = (v - 0.5) * sideM;
//     points.push([x, z, altitudeAt(data, x, z)]);
//   }
//
//   let lengthM = 0;
//   for (let i = 1; i < points.length; i++) {
//     const [x0, z0, a0] = points[i - 1];
//     const [x1, z1, a1] = points[i];
//     lengthM += Math.hypot(x1 - x0, z1 - z0, a1 - a0);
//   }
//
//   // Point le plus haut de la grille
//   let best = 0;
//   for (let i = 1; i < heights.length; i++) {
//     if (heights[i] > heights[best]) best = i;
//   }
//   const peakX = ((best % n) / (n - 1) - 0.5) * sideM;
//   const peakZ = (Math.floor(best / n) / (n - 1) - 0.5) * sideM;
//
//   const first = points[0];
//   const last = points[points.length - 1];
//
//   return {
//     track: { points, lengthM },
//     markers: [
//       {
//         x: peakX,
//         z: peakZ,
//         alt: heights[best],
//         label: "Point culminant",
//         kind: "peak",
//       },
//       {
//         x: first[0],
//         z: first[1],
//         alt: first[2],
//         label: "Départ",
//         kind: "start",
//       },
//       { x: last[0], z: last[1], alt: last[2], label: "Arrivée", kind: "end" },
//     ],
//   };
// }
