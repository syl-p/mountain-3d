export type LonLat = [number, number]

const MAX_POINTS = 3000

export function parseGpx(xml: string): LonLat[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if (doc.querySelector("parsererror")) throw new Error("Fichier GPX illisible")

  // un tracé (trkpt) ou, à défaut, un itinéraire (rtept)
  let nodes = Array.from(doc.getElementsByTagName("trkpt"))
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagName("rtept"))

  const points: LonLat[] = []
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute("lat") ?? "")
    const lon = parseFloat(n.getAttribute("lon") ?? "")
    if (Number.isFinite(lat) && Number.isFinite(lon)) points.push([lon, lat])
  }
  if (points.length < 2) throw new Error("Aucun tracé trouvé dans ce fichier GPX")

  // allège les très gros fichiers : on garde un point sur k, et toujours le dernier
  if (points.length > MAX_POINTS) {
    const k = Math.ceil(points.length / MAX_POINTS)
    const thin = points.filter((_, i) => i % k === 0)
    const last = points[points.length - 1]
    if (thin[thin.length - 1] !== last) thin.push(last)
    return thin
  }
  return points
}
