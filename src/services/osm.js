// Servizi gratuiti OpenStreetMap: ultima riserva se Google e TomTom non sono disponibili.
import { getJson } from './http'

export async function osmGeocode(q, near, city) {
  const [s, w, n, e] = city.bbox
  const base = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=it`
  // Prima cerco nel comune, poi nell'area circostante
  let j = await getJson(`${base}&q=${encodeURIComponent(`${q}, ${city.name}`)}`)
  if (!j.length) j = await getJson(`${base}&viewbox=${w},${n},${e},${s}&bounded=1&q=${encodeURIComponent(q)}`)
  if (!j.length) return null
  return { name: j[0].name || q, address: j[0].display_name, pos: [+j[0].lat, +j[0].lon] }
}

const TURN_TYPES = new Set(['turn', 'end of road', 'fork', 'continue', 'roundabout', 'rotary', 'merge'])
const DIRECTION = {
  left: 'Gira a sinistra',
  right: 'Gira a destra',
  'slight left': 'Tieni la sinistra',
  'slight right': 'Tieni la destra',
  'sharp left': 'Gira tutto a sinistra',
  'sharp right': 'Gira tutto a destra',
  uturn: 'Torna indietro',
}

export async function osmRoute(from, to) {
  const url =
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`
  const j = await getJson(url)
  const r = j.routes?.[0]
  if (!r) throw new Error('Percorso non trovato')
  const turns = r.legs
    .flatMap((l) => l.steps)
    .filter((s) => TURN_TYPES.has(s.maneuver.type) && DIRECTION[s.maneuver.modifier])
    .map((s) => ({
      pos: [s.maneuver.location[1], s.maneuver.location[0]],
      text: `${DIRECTION[s.maneuver.modifier]}${s.name ? ` in ${s.name}` : ''}`,
      street: s.name || '',
    }))
  return { line: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]), meters: r.distance, turns, source: 'OSRM' }
}

export async function osmReverse([lat, lon]) {
  const j = await getJson(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=it&zoom=18`
  )
  if (!j.address) return null
  const a = j.address
  const street = [a.road || a.pedestrian || a.square, a.house_number].filter(Boolean).join(' ')
  const town = a.town || a.village || a.city || ''
  return { address: [street, town].filter(Boolean).join(', ') || j.display_name, pos: [lat, lon] }
}
