import "leaflet/dist/leaflet.css";
import type { BBox } from "../utils/api";
import { MapContainer, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { parseGpx, type LonLat } from "../utils/gpx";
import { latLngBounds, Point } from "leaflet";

const SIDE_PX = 240; // côté du viseur à l'écran
const MIN_KM = 0.5;
const MAX_KM = 14.5; // un peu sous les 15 km du back : sa mesure en Lambert-93 diffère de quelques %

type TrackerProps = {
  onChange: (bbox: BBox, sideKm: number) => void;
};

function TrackLayer({ track }: { track: LonLat[] | null }) {
  const map = useMap();
  const latlngs = useMemo(
    () => track?.map(([lon, lat]): [number, number] => [lat, lon]) ?? null,
    [track],
  );

  useEffect(() => {
    if (!latlngs) return;
    const bounds = latLngBounds(latlngs);
    const size = map.getSize();
    const fit = SIDE_PX * 0.8; // le tracé occupe au plus 80 % du viseur
    const zoom = Math.min(map.getBoundsZoom(bounds, false, new Point(size.x - fit, size.y - fit)), 14);
    map.setView(bounds.getCenter(), zoom);
  }, [latlngs, map]);

  return latlngs ? <Polyline positions={latlngs} pathOptions={{ color: "#e53935", weight: 3 }} /> : null;
}

function ViewFinderTracker({ onChange }: TrackerProps) {
  const map = useMap();
  const update = useCallback(() => {
    const size = map.getSize(); // taille de la carte en pixels
    const cx = size.x / 2;
    const cy = size.y / 2;
    const h = SIDE_PX / 2;

    const nw = map.containerPointToLatLng([cx - h, cy - h]); // coin haut-gauche du viseur
    const se = map.containerPointToLatLng([cx + h, cy + h]); // coin bas-droit
    const west = map.containerPointToLatLng([cx - h, cy]);
    const east = map.containerPointToLatLng([cx + h, cy]);

    onChange([nw.lng, se.lat, se.lng, nw.lat], map.distance(west, east) / 1000);
  }, [map, onChange]);

  useEffect(() => {
    update(); // calcul initial, avant tout mouvement
  }, [update]);

  useMapEvents({ moveend: update, resize: update });
  return null;
}


type Props = {
  bbox: BBox | null;
  track: LonLat[] | null;
  onTrackChange: (track: LonLat[] | null) => void
  onBboxChange: (bbox: BBox) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
};

export function MapSelector({
  track,
  onTrackChange,
  onBboxChange,
  onGenerate,
  loading,
  error,
}: Props) {
  const [sideKm, setSideKm] = useState<number | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleView = useCallback(
    (bbox: BBox, km: number) => {
      onBboxChange(bbox);
      setSideKm(km);
    },
    [onBboxChange],
  );

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;
    try {
      onTrackChange(parseGpx(await file.text()));
      setGpxError(null);
    } catch (err) {
      setGpxError(err instanceof Error ? err.message : String(err));
    }
  }


  const tooSmall = sideKm !== null && sideKm < MIN_KM;
  const tooBig = sideKm !== null && sideKm > MAX_KM;
  const valid = sideKm !== null && !tooSmall && !tooBig;
  const label = tooSmall
    ? "Zone trop petite : dézoome"
    : tooBig
      ? "Zone trop grande : zoome"
      : sideKm !== null
        ? `≈ ${sideKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km de côté`
        : "";

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <MapContainer
        center={[45.85, 6.9]}
        zoom={11}
        zoomSnap={0.25}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewFinderTracker onChange={handleView} />
        <TrackLayer track={track} />
      </MapContainer>

      {/* Viseur : fixe au centre de l'écran, la carte bouge dessous */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: SIDE_PX,
            height: SIDE_PX,
            transform: "translate(-50%, -50%)",
            boxSizing: "border-box",
            border: `2px solid ${valid ? "#ffffff" : "#ff5a5a"}`,
            boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.35)", // assombrit tout ce qui est hors du viseur
          }}
        />
        <div
          style={{
            position: "absolute",
            top: `calc(50% + ${SIDE_PX / 2 + 10}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            color: valid ? "black" : "crimson",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "white",
          padding: 8,
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 13, color: "#555" }}>
          Déplace et zoome la carte pour cadrer la zone
        </span>
        <input ref={fileRef} type="file" accept=".gpx" onChange={handleFile} />
        {track && (
          <button onClick={() => onTrackChange(null)} disabled={loading}>
            Retirer le tracé
          </button>
        )}
        <button onClick={onGenerate} disabled={!valid || loading}>
          {loading ? "Chargement…" : "Générer la 3D"}
        </button>
        {error && <span style={{ color: "crimson" }}>{error}</span>}
        {gpxError && <span style={{ color: "crimson" }}>{gpxError}</span>}
      </div>
    </div>
  );
}
