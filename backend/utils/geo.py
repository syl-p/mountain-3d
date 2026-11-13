from dataclasses import dataclass
from pyproj import Transformer

MIN_SIDE_M = 500
MAX_SIDE_M = 15_000

_to_l93 = Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True) # 2.6, 42.5 -> 20000, 3000
_to_wgs = Transformer.from_crs("EPSG:2154", "EPSG:4326", always_xy=True)

class SquareError(ValueError):
    pass

@dataclass(frozen=True)
class Square:
    x0: float
    y0: float
    side: float

    @property
    def bbox_l93(self) -> tuple[float, float, float, float]:
        return (self.x0, self.y0, self.x0 + self.side, self.y0 + self.side)

    @property
    def center(self) -> tuple[float, float]:
        return (self.x0 + self.side / 2, self.y0 + self.side / 2)

    @property
    def bounds_wgs84(self) -> tuple[float, float, float, float]:
        """Boîte englobante en degrés, dans l'ordre sud, ouest, nord, est."""
        pts = self.corners_wgs84()
        lons = [p[0] for p in pts]
        lats = [p[1] for p in pts]
        return min(lats), min(lons), max(lats), max(lons)

    def to_local(self, lon: float, lat: float) -> tuple[float, float]:
        X, Y = _to_l93.transform(lon, lat)
        cx, cy = self.center
        return X - cx, cy - Y

    def corners_wgs84(self) -> list[tuple[float, float]]:
        """Coins SO, SE, NE, NO en (lon, lat)."""
        x0, y0, x1, y1 = self.bbox_l93
        pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        return [_to_wgs.transform(x, y) for x, y in pts]


def square_from_bbox(lon_min: float, lat_min: float, lon_max: float, lat_max: float) -> Square:
    list_of_corners = [(lon_min, lat_min), (lon_max, lat_min), (lon_max, lat_max), (lon_min, lat_max)]
    corners_in_l93 = [_to_l93.transform(lon, lat) for lon, lat in list_of_corners]

    xs, ys = [c[0] for c in corners_in_l93], [c[1] for c in corners_in_l93]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    side = max(max(xs) - min(xs), max(ys) - min(ys))

    if side < MIN_SIDE_M:
        raise SquareError(f"Zone trop petite ({side:.0f} m), minimum {MIN_SIDE_M} m")
    if side > MAX_SIDE_M:
        raise SquareError(f"Zone trop grande ({side/1000:.1f} km), maximum {MAX_SIDE_M/1000:.0f} km")

    side = round(side)
    return Square(x0=round(cx - side / 2), y0=round(cy - side / 2), side=side)