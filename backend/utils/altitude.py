import numpy

# Cells for array (n length) from side
def position_in_cells(array_length: float, side: float, x: float, z: float) -> tuple[float, float]:
    n = array_length

    # get cells from west to east (fx) and north to south (fz)
    fx = min(max((x / side + 0.5) * (n - 1), 0), n - 1)
    fz = min(max((z / side + 0.5) * (n - 1), 0), n - 1)

    return (fx, fz)
    

# return altitude at position (x, z) in metters from center
def altitude_at(dem: numpy.ndarray, side: float, x: float, z: float, fallback: float) -> float:
    n = dem.shape[0]

    fx, fz = position_in_cells(n, side, x, z)

    c0, r0 = int(fx), int(fz) # first case
    c1, r1 = min(c0 + 1, n - 1), min(r0 + 1, n - 1) # last case
    tx, tz = fx - c0, fz - r0
    
    def h(r: int, c: int) -> float:
        v = float(dem[r, c])
        return fallback if v < -1000 else v  # fallback for empty

    top = h(r0, c0) * (1 - tx) + h(r0, c1) * tx
    bottom = h(r1, c0) * (1 - tx) + h(r1, c1) * tx

    return top * (1 - tz) + bottom * tz
