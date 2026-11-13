import asyncio
import base64

import httpx
import numpy

from services.markers import build_markers
from services.peak import fetch_peaks
from services.track import build_track
from utils.geo import Square

WMS_URL = "https://data.geopf.fr/wms-r"
DEM_LAYER = "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES"
ORTHO_LAYER = "ORTHOIMAGERY.ORTHOPHOTOS"
NODATA = -99999.0

class IGNError(RuntimeError):
    pass

async def wms_query(client: httpx.AsyncClient, sq: Square, layer: str, size: int, fmt: str) -> httpx.Response:
    x0, y0, x1, y1 = sq.bbox_l93
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.3.0",
        "STYLES": "",
        "REQUEST": "GetMap",
        "LAYERS": layer,
        "CRS": "EPSG:2154",
        "BBOX": f"{x0},{y0},{x1},{y1}",
        "WIDTH": f"{size}",
        "HEIGHT": f"{size}",
        "FORMAT": fmt,
    }
    try:
        response = await client.get(WMS_URL, params=params)
        response.raise_for_status()
    except httpx.HTTPStatusError as err:
        raise IGNError(f"IGN a répondu {err.response.status_code} : {err.response.text[:500]}")
    except httpx.HTTPError as err:
        raise IGNError(f"IGN injoignable ou en erreur : {err}")

    return response

async def get_terrain(sq: Square, dem_size: int = 256, ortho_size: int = 1024, track: list[tuple[float, float]] | None = None) -> dict:
    south, west, north, east = sq.bounds_wgs84

    async with httpx.AsyncClient(timeout=60) as client:
        dem_r, ortho_r, peaks = await asyncio.gather(
            wms_query(client, sq, DEM_LAYER, dem_size, "image/x-bil;bits=32"),
            wms_query(client, sq, ORTHO_LAYER, ortho_size, "image/jpeg"),
            fetch_peaks(client, south, west, north, east),
        )

        # dem_r = await wms_query(client, sq, DEM_LAYER, dem_size, "image/x-bil;bits=32")
        # ortho_r = await wms_query(client, sq, ORTHO_LAYER, ortho_size, "image/jpeg")

    # client = httpx.AsyncClient()
    # try:
    #     dem_r = await wms_query(client, sq, DEM_LAYER, dem_size, "image/x-bil;bits=32")
    # finally:
    #     await client.aclose()

    if len(dem_r.content) != dem_size * dem_size * 4:
        raise IGNError(f"Réponse MNT inattendue : {dem_r.content[:200]!r}")

    if not ortho_r.headers.get("content-type", "").startswith("image/"):
        raise IGNError(f"Réponse ortho inattendue : {ortho_r.content[:200]!r}")
    
    dem = numpy.frombuffer(dem_r.content, dtype="<f4").reshape(dem_size, dem_size)
    valid = dem > -1000

    if not valid.any():
        raise IGNError("Aucune donnée d'altitude sur cette zone")
    dem = numpy.where(valid, dem, NODATA).astype("<f4")

    z_min = float(dem[valid].min())

    return {
        "n": dem_size,
        "side_m": sq.side,
        "z_min": z_min,
        "z_max": float(dem[valid].max()),
        "nodata": NODATA,
        "heights_b64": base64.b64encode(dem.tobytes()).decode(),
        "ortho_b64": base64.b64encode(ortho_r.content).decode(),
        "overlay": {
            "markers": build_markers(sq, dem, z_min, peaks),
            "track": build_track(sq, dem, z_min, track) if track else None,
        }
    }
