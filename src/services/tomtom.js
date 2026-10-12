// TomTom: ricerca e percorso come riserva di Google, e soprattutto incidenti/cantieri/chiusure
// in tempo reale (Google non li espone come dati).
import { TOMTOM_KEY } from '../config'
import { getJson } from './http'

const TT = 'https://api.tomtom.com'
export const hasTomTom = Boolean(TOMTOM_KEY)

export const flowTileUrl = hasTomTom
  ? `${TT}/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}&tileSize=256`
  : null

export async function ttGeocode(q, near) {
  const url =
    `${TT}/search/2/search/${encodeURIComponent(q)}.json?key=${TOMTOM_KEY}` +
    `&lat=${near[0]}&lon=${near[1]}&radius=6000&countrySet=IT&language=it-IT&limit=1`
  const r = (await getJson(url)).results?.[0]
  if (!r) return null
  return {
    name: r.poi?.name || r.address?.freeformAddress || q,
    address: r.address?.freeformAddress || '',
    pos: [r.position.lat, r.position.lon],
  }
}

export async function ttRoute(from, to) {
  const url =
    `${TT}/routing/1/calculateRoute/${from[0]},${from[1]}:${to[0]},${to[1]}/json` +
    `?key=${TOMTOM_KEY}&travelMode=pedestrian&routeType=shortest&language=it-IT&instructionsType=text`
  const r = (await getJson(url)).routes[0]
  const turns = (r.guidance?.instructions || [])
    .filter((i) => /TURN|BEAR|KEEP|ROUNDABOUT|SHARP/.test(i.maneuver || ''))
    .map((i) => ({ pos: [i.point.latitude, i.point.longitude], text: i.message, street: i.street || '' }))
  return {
    line: r.legs.flatMap((l) => l.points.map((p) => [p.latitude, p.longitude])),
    meters: r.summary.lengthInMeters,
    turns,
    source: 'TomTom',
  }
}

// ---------- Incidenti, cantieri, chiusure (TomTom Traffic Incidents v5) ----------
const ICON = {
  0: ['altro', 'Problema stradale'],
  1: ['incidente', 'Incidente'],
  2: ['nebbia', 'Nebbia'],
  3: ['pericolo', 'Condizioni pericolose'],
  4: ['pioggia', 'Pioggia'],
  5: ['ghiaccio', 'Ghiaccio'],
  6: ['coda', 'Traffico intenso'],
  7: ['corsia', 'Corsia chiusa'],
  8: ['chiusura', 'Strada chiusa'],
  9: ['cantiere', 'Cantiere'],
  10: ['vento', 'Vento forte'],
  11: ['allagamento', 'Allagamento'],
  14: ['guasto', 'Veicolo in panne'],
}

export async function trafficIncidents(bbox) {
  if (!hasTomTom) return []
  const [s, w, n, e] = bbox
  const fields =
    '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},from,to}}}'
  const url =
    `${TT}/traffic/services/5/incidentDetails?key=${TOMTOM_KEY}&bbox=${w},${s},${e},${n}` +
    `&fields=${encodeURIComponent(fields)}&language=it-IT&timeValidityFilter=present`
  const j = await getJson(url)
  return (j.incidents || []).map((inc, i) => {
    const g = inc.geometry
    const coords = g.type === 'Point' ? [g.coordinates] : g.coordinates
    const line = coords.map(([lon, lat]) => [lat, lon])
    const [kind, label] = ICON[inc.properties.iconCategory] || ICON[0]
    const desc = inc.properties.events?.map((ev) => ev.description).join(', ')
    return {
      id: `tt-${i}`,
      kind,
      label,
      description: [desc, inc.properties.from && `da ${inc.properties.from}`].filter(Boolean).join(' — '),
      line,
      pos: line[Math.floor(line.length / 2)],
      source: 'TomTom live',
    }
  })
}
