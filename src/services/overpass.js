// Strade principali, strisce pedonali e semafori da OpenStreetMap (Overpass).
// Se Overpass è lento o irraggiungibile usiamo lo snapshot di Prevalle incluso nell'app.
import snapshot from '../data/prevalleOsm.json'

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

function inBbox([lat, lon], [s, w, n, e]) {
  return lat >= s && lat <= n && lon >= w && lon <= e
}

function fromSnapshot(bbox) {
  return {
    roads: snapshot.roads.filter((r) => r.geom.some((p) => inBbox(p, bbox))),
    nodes: snapshot.nodes.filter((n) => inBbox([n.lat, n.lon], bbox)),
    source: 'snapshot OSM',
  }
}

// Area coperta dallo snapshot incluso nell'app
const SNAPSHOT_BBOX = [45.53, 10.395, 45.568, 10.445]

export async function streetFeatures(bbox) {
  const [S, W, N, E] = SNAPSHOT_BBOX
  if (bbox[0] >= S && bbox[1] >= W && bbox[2] <= N && bbox[3] <= E) return fromSnapshot(bbox)
  const [s, w, n, e] = bbox.map((v) => v.toFixed(5))
  const q =
    `[out:json][timeout:10];(` +
    `way["highway"~"^(trunk|primary|secondary|tertiary)$"](${s},${w},${n},${e});` +
    `node["highway"~"^(traffic_signals|crossing)$"](${s},${w},${n},${e}););out geom;`
  for (const url of ENDPOINTS) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) continue
      const j = await res.json()
      const roads = j.elements
        .filter((x) => x.type === 'way')
        .map((x) => ({
          name: x.tags.name || x.tags.ref || 'strada principale',
          ref: x.tags.ref || '',
          highway: x.tags.highway,
          geom: x.geometry.map((p) => [p.lat, p.lon]),
        }))
      const nodes = j.elements
        .filter((x) => x.type === 'node')
        .map((x) => ({ lat: x.lat, lon: x.lon, highway: x.tags.highway, crossing: x.tags.crossing || '' }))
      return { roads, nodes, source: 'OSM live' }
    } catch {
      /* prova il prossimo endpoint */
    }
  }
  return fromSnapshot(bbox)
}
