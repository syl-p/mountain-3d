import numpy

from utils.altitude import altitude_at
from utils.geo import Square

STEP_M = 20.0
MAX_POINTS = 4000

def resample(xz: numpy.ndarray, step: float)-> numpy.ndarray:
    """Redécoupe une ligne en points régulièrement espacés le long de son parcours."""
    d = numpy.diff(xz, axis=0)                           # écart entre deux points successifs
    seg = numpy.hypot(d[:, 0], d[:, 1])                  # longueur de chaque segment (Pythagore)

    cum = numpy.concatenate(([0.0], numpy.cumsum(seg)))  # distance parcourue à chaque point depuis 0
    total = cum[-1]
    if total == 0:
        return xz[:1]

    step = max(step, total / MAX_POINTS)
    count = max(2, round(total / step) + 1)
    targets = numpy.linspace(0, total, count)            # distances voulues : 0, 20, 40... jusqu'au bout
    x = numpy.interp(targets, cum, xz[:, 0])
    z = numpy.interp(targets, cum, xz[:, 1])
    return numpy.column_stack((x, z))


def build_track(sq: Square, dem: numpy.ndarray, z_min: float, lonlat: list[tuple[float, float]]) -> dict | None:
    if len(lonlat) < 2:
        return None

    xz = numpy.array([sq.to_local(lon, lat) for lon, lat in lonlat])
    pts = resample(xz, STEP_M)

    half = sq.side / 2
    inside = (numpy.abs(pts[:, 0]) <= half) & (numpy.abs(pts[:, 1]) <= half)
    is_clipped = not inside.all()
    pts = pts[inside]

    if len(pts) < 2:
        return None

    alts = numpy.array([altitude_at(dem, sq.side, x, z, fallback=z_min) for x,z in pts])
    dx = numpy.diff(pts[:, 0])
    dz = numpy.diff(pts[:, 1])
    da = numpy.diff(alts)
    length = float(numpy.sum(numpy.sqrt(dx**2 + dz**2 + da**2)))

    return {
        "points": [{"x": float(x), "z": float(z), "alt": float(alt)} for (x, z), alt in zip(pts, alts)],
        "length_m": round(length),
        "ascent_m": round(float(da[da > 0].sum())),
        "descent_m": round(float(-da[da < 0].sum())),
        "is_clipped": is_clipped,
    }
