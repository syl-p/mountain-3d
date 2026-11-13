import numpy

from utils.altitude import altitude_at
from utils.geo import Square

MAX_MARKERS = 10

def build_markers(sq: Square, dem: numpy.ndarray, z_min: float, peaks: list[dict]) -> list[dict]:
    half = sq.side / 2
    markers = []

    for p in peaks:
        x, z = sq.to_local(p["lon"], p["lat"])
        if abs(x) > half or abs(z) > half:
            continue # out of the square

        markers.append({
            "x": x,
            "z": z,
            "alt": altitude_at(dem, sq.side, x, z, fallback=z_min),
            "ele": p["ele"],
            "label": p["name"],
            "kind": "peak"
        })

    markers.sort(key= lambda m: m["ele"] if m["ele"] is not None else m["alt"], reverse=True)
    return markers[:MAX_MARKERS]