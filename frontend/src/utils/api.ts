import type { Overlay } from "./overlay.ts";

export type Terrain = {
  n: number;
  sideM: number;
  zMin: number;
  zMax: number;
  heights: Float32Array;
  orthoUrl: string;
  overlay: Overlay;
};
export type BBox = [number, number, number, number];

export async function fetchTerrain(
  bbox: BBox,
  track?: [number, number][],
): Promise<Terrain> {
  const res = await fetch("http://localhost:8000/terrain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "box", bbox, track }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail ?? `Erreur ${res.status}`);
  }

  const d = await res.json();

  // base64 -> octets -> tableau de nombres décimaux 32 bits
  const bin = atob(d.heights_b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const t = d.overlay.track;
  return {
    n: d.n,
    sideM: d.side_m,
    zMin: d.z_min,
    zMax: d.z_max,
    heights: new Float32Array(bytes.buffer),
    orthoUrl: `data:image/jpeg;base64,${d.ortho_b64}`,
    overlay: {
      markers: d.overlay.markers,
      track: t
        ? {
            points: t.points,
            lengthM: t.length_m,
            isClipped: t.is_clipped,
            ascentM: t.ascent_m,
            descentM: t.descent_m,
          }
        : null,
    },
  };
}
