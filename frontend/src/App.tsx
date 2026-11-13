import { Suspense, useState } from "react";
import {
  fetchTerrain,
  type BBox,
  type Terrain as TerrainResponse,
} from "./utils/api.ts";
import { Canvas } from "@react-three/fiber";
import { Terrain } from "./components/Terrain.tsx";
import { Loader, OrbitControls } from "@react-three/drei";
import { MapSelector } from "./components/MapSelector.tsx";
import { Overlay3D } from "./components/Overlay3D.tsx";
import { type LonLat } from "./utils/gpx.ts";

function App() {
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [track, setTrack] = useState<LonLat[] | null>(null);
  const [data, setData] = useState<TerrainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exaggeration, setExaggeration] = useState(1.5);


  async function generate() {
    if (!bbox) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTerrain(bbox, track ?? undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <MapSelector
        bbox={bbox}
        track={track}
        onTrackChange={setTrack}
        onBboxChange={setBbox}
        onGenerate={generate}
        loading={loading}
        error={error}
      />
    );
  }

  const s = data.sideM;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          padding: 12,
          display: "flex",
          gap: 12,
        }}
      >
        <button onClick={() => setData(null)}>← Modifier la zone</button>
        <label>
          Exagération ×{exaggeration.toFixed(1)}{" "}
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={exaggeration}
            onChange={(e) => setExaggeration(Number(e.target.value))}
          />
        </label>
        {data.overlay.track && (
          <span>
            {(data.overlay.track.lengthM / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km
            {" · ↑ "}{data.overlay.track.ascentM} m{" · ↓ "}{data.overlay.track.descentM} m
            {data.overlay.track.isClipped && " · tracé coupé par la zone"}
          </span>
        )}
      </div>
      <Canvas
        camera={{
          position: [0, s * 0.7, s * 0.9],
          near: s / 1000,
          far: s * 10,
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[s, s, s * 0.5]} intensity={2} />
        <Suspense fallback={null}>
          <Terrain data={data} exaggeration={exaggeration} />
          <Overlay3D
            data={data}
            overlay={data.overlay}
            exaggeration={exaggeration}
          />
        </Suspense>
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.49} />
      </Canvas>
      <Loader dataInterpolation={(p) => `Chargement ${p.toFixed(0)} %`} />
    </div>
  );
}

export default App;
