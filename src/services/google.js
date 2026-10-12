// Google Maps Platform: Places API (New) per la ricerca, Routes API per il percorso a piedi.
// Le API vanno abilitate nel progetto Google Cloud della chiave (vedi README).
import { GOOGLE_KEY } from '../config'
import { getJson } from './http'

export const hasGoogle = Boolean(GOOGLE_KEY)

const headers = (fieldMask) => ({
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': GOOGLE_KEY,
  'X-Goog-FieldMask': fieldMask,
})

// "farmacia" -> luogo più pertinente vicino alla persona
export async function googleGeocode(q, near) {
  const j = await getJson('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: headers('places.displayName,places.formattedAddress,places.location'),
    body: JSON.stringify({
      textQuery: q,
      languageCode: 'it',
      regionCode: 'IT',
      pageSize: 1,
      locationBias: { circle: { center: { latitude: near[0], longitude: near[1] }, radius: 5000 } },
    }),
  })
  const p = j.places?.[0]
  if (!p) return null
  return {
    name: p.displayName?.text || q,
    address: p.formattedAddress || '',
    pos: [p.location.latitude, p.location.longitude],
  }
}

// Le svolte vere: le altre manovre (DEPART, STRAIGHT, …) non sono incroci da segnalare
const TURNS = /^(TURN_|ROUNDABOUT_|FORK_|RAMP_|UTURN_)/

export async function googleRoute(from, to) {
  const ll = ([latitude, longitude]) => ({ location: { latLng: { latitude, longitude } } })
  const j = await getJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: headers(
      'routes.distanceMeters,routes.polyline.encodedPolyline,' +
        'routes.legs.steps.startLocation,routes.legs.steps.navigationInstruction'
    ),
    body: JSON.stringify({ origin: ll(from), destination: ll(to), travelMode: 'WALK', languageCode: 'it-IT' }),
  })
  const r = j.routes?.[0]
  if (!r) throw new Error('Percorso non trovato')
  const turns = r.legs
    .flatMap((l) => l.steps || [])
    .filter((s) => TURNS.test(s.navigationInstruction?.maneuver || ''))
    .map((s) => ({
      pos: [s.startLocation.latLng.latitude, s.startLocation.latLng.longitude],
      // es. "Svolta a sinistra e prendi Via Bonsignori": già in italiano, la teniamo sulla prima riga
      text: s.navigationInstruction.instructions.split('\n')[0],
      street: '',
    }))
  return { line: decodePolyline(r.polyline.encodedPolyline), meters: r.distanceMeters, turns, source: 'Google' }
}

// Algoritmo standard Google "Encoded Polyline"
export function decodePolyline(str) {
  const out = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < str.length) {
    for (const k of [0, 1]) {
      let shift = 0
      let result = 0
      let b
      do {
        b = str.charCodeAt(i++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const d = result & 1 ? ~(result >> 1) : result >> 1
      if (k === 0) lat += d
      else lng += d
    }
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}

// Coordinate -> indirizzo leggibile (Geocoding API)
export async function googleReverse([lat, lng]) {
  const j = await getJson(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=it&key=${GOOGLE_KEY}`
  )
  const r = j.results?.find((x) => x.types.some((t) => ['street_address', 'premise', 'route'].includes(t))) || j.results?.[0]
  if (!r) return null
  return { address: r.formatted_address.replace(/, Italia$/, ''), pos: [lat, lng] }
}
