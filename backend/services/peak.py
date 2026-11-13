import httpx
import logging
import re

logger = logging.getLogger("uvicorn.error")
OVERPASS_URL = "https://overpass.openstreetmap.fr/api/interpreter"

def parse_ele(value: str | None) -> float | None:
    if not value:
        return None
    m = re.match(r"\s*(-?\d+(?:[.,]\d+)?)", value)
    return float(m.group(1).replace(",", ".")) if m else None

async def fetch_peaks(client: httpx.AsyncClient, south: float, west: float, north: float, east: float) -> list[dict]:
    query = f'[out:json][timeout:25];node["natural"="peak"]["name"]({south},{west},{north},{east});out;'

    try:
        r = await client.post(
            OVERPASS_URL,
            data={"data": query},
            headers={"User-Agent": "mountain-3d/0.1"}
        )

        r.raise_for_status()
        elements = r.json()["elements"]
    except (httpx.HTTPError, ValueError, KeyError) as err:
        logger.warning("Overpass indisponible : %s", err)
        return []

    return [
        {
            "lon": e["lon"], 
            "lat": e["lat"],
            "name": e["tags"]["name"],
            "ele": parse_ele(e["tags"].get("ele")),
        } for e in elements
    ]

    