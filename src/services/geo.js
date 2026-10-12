// Geometria su piccola scala (centro storico): proiezione equirettangolare locale in metri.
const R = 6371000
const toRad = (d) => (d * Math.PI) / 180

export function haversine([lat1, lon1], [lat2, lon2]) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Proiezione in metri rispetto a un'origine
export function projector([lat0, lon0]) {
  const kx = Math.cos(toRad(lat0)) * (Math.PI / 180) * R
  const ky = (Math.PI / 180) * R
  return {
    toXY: ([lat, lon]) => [(lon - lon0) * kx, (lat - lat0) * ky],
    toLatLon: ([x, y]) => [lat0 + y / ky, lon0 + x / kx],
  }
}

// Punto più vicino su segmento AB (coordinate xy)
function closestOnSegment(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  return { x: a[0] + t * dx, y: a[1] + t * dy, t }
}

// Distanza di un punto da una polilinea + posizione lungo la polilinea (metri dall'inizio)
export function distanceToPolyline(point, line, proj = projector(point)) {
  const p = proj.toXY(point)
  let best = { dist: Infinity, along: 0, index: 0 }
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const a = proj.toXY(line[i])
    const b = proj.toXY(line[i + 1])
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1])
    const c = closestOnSegment(p, a, b)
    const d = Math.hypot(p[0] - c.x, p[1] - c.y)
    if (d < best.dist) best = { dist: d, along: acc + c.t * segLen, index: i }
    acc += segLen
  }
  return best
}

export function polylineLength(line) {
  let L = 0
  for (let i = 0; i < line.length - 1; i++) L += haversine(line[i], line[i + 1])
  return L
}

// Punto a distanza `meters` lungo la polilinea
export function pointAlong(line, meters) {
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const seg = haversine(line[i], line[i + 1])
    if (acc + seg >= meters) {
      const t = seg ? (meters - acc) / seg : 0
      return [line[i][0] + (line[i + 1][0] - line[i][0]) * t, line[i][1] + (line[i + 1][1] - line[i][1]) * t]
    }
    acc += seg
  }
  return line[line.length - 1]
}

// Campiona la polilinea ogni `step` metri
export function samplePolyline(line, step = 3) {
  const L = polylineLength(line)
  const out = []
  for (let m = 0; m <= L; m += step) out.push({ along: m, pos: pointAlong(line, m) })
  return out
}

export function bboxOf(line, padMeters = 0) {
  let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity
  for (const [la, lo] of line) {
    s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo)
  }
  const dLat = padMeters / 111320
  const dLon = padMeters / (111320 * Math.cos(toRad((s + n) / 2)))
  return [s - dLat, w - dLon, n + dLat, e + dLon]
}

// Segno del lato (sinistra/destra) di p rispetto al segmento più vicino di una polilinea
export function sideOfPolyline(pXY, lineXY) {
  let best = { d: Infinity, side: 0 }
  for (let i = 0; i < lineXY.length - 1; i++) {
    const a = lineXY[i]
    const b = lineXY[i + 1]
    const c = closestOnSegment(pXY, a, b)
    const d = Math.hypot(pXY[0] - c.x, pXY[1] - c.y)
    if (d < best.d) {
      const cross = (b[0] - a[0]) * (pXY[1] - a[1]) - (b[1] - a[1]) * (pXY[0] - a[0])
      best = { d, side: Math.sign(cross) }
    }
  }
  return best
}
