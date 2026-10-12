// Paese di riferimento: dove la persona cammina di solito.
// Da qui partono ricerca dei posti, cantieri/incidenti, meteo e centro della mappa.
import { GOOGLE_KEY } from '../config'
import { hasGoogle } from './google'
import { getJson } from './http'

// Area minima attorno al paese (gradi ≈ 3 km): nei paesi piccoli il confine è stretto
const MIN_HALF = 0.03

function makeBbox(center, box) {
  let [s, w, n, e] = box || [center[0], center[1], center[0], center[1]]
  s = Math.min(s, center[0] - MIN_HALF)
  n = Math.max(n, center[0] + MIN_HALF)
  w = Math.min(w, center[1] - MIN_HALF)
  e = Math.max(e, center[1] + MIN_HALF)
  return [s, w, n, e].map((v) => Math.round(v * 1e4) / 1e4)
}

const town = (name, label, center, box) => ({ name, label, center, bbox: makeBbox(center, box) })

// ---------- Ricerca per nome ----------
async function googleTowns(q) {
  const j = await getJson('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.viewport',
    },
    body: JSON.stringify({
      textQuery: q,
      includedType: 'locality',
      strictTypeFiltering: true,
      languageCode: 'it',
      regionCode: 'IT',
      pageSize: 5,
    }),
  })
  return (j.places || []).map((p) => {
    const c = [p.location.latitude, p.location.longitude]
    const v = p.viewport
    const box = v ? [v.low.latitude, v.low.longitude, v.high.latitude, v.high.longitude] : null
    return town(p.displayName.text, p.formattedAddress, c, box)
  })
}

async function osmTowns(q) {
  const j = await getJson(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=it&featuretype=settlement&addressdetails=1&q=${encodeURIComponent(q)}`
  )
  return j.map((r) => {
    const a = r.address || {}
    const name = a.town || a.village || a.city || a.municipality || r.name
    const [s, n, w, e] = r.boundingbox.map(Number)
    return town(name, [a.county, a.state].filter(Boolean).join(', '), [+r.lat, +r.lon], [s, w, n, e])
  })
}

export async function searchTowns(q) {
  if (!q.trim()) return []
  if (hasGoogle) {
    try {
      const list = await googleTowns(q.trim())
      if (list.length) return list
    } catch (e) {
      console.warn('Ricerca paese con Google fallita, uso OpenStreetMap', e)
    }
  }
  return osmTowns(q.trim())
}

// ---------- Dalla posizione GPS al paese ----------
async function googleTownAt([lat, lng]) {
  const j = await getJson(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&language=it&key=${GOOGLE_KEY}`
  )
  const r = j.results?.[0]
  if (!r) return null
  const name = r.address_components.find((c) => c.types.includes('locality'))?.long_name || r.formatted_address
  const v = r.geometry.bounds || r.geometry.viewport
  const box = v ? [v.southwest.lat, v.southwest.lng, v.northeast.lat, v.northeast.lng] : null
  const loc = r.geometry.location
  return town(name, r.formatted_address.replace(/, Italia$/, ''), [loc.lat, loc.lng], box)
}

async function osmTownAt([lat, lng]) {
  const j = await getJson(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=it&addressdetails=1`
  )
  const a = j.address || {}
  const name = a.town || a.village || a.city || a.municipality
  if (!name) return null
  const [s, n, w, e] = (j.boundingbox || []).map(Number)
  return town(name, [a.county, a.state].filter(Boolean).join(', '), [+j.lat, +j.lon], j.boundingbox ? [s, w, n, e] : null)
}

export async function townAt(pos) {
  if (hasGoogle) {
    try {
      const t = await googleTownAt(pos)
      if (t) return t
    } catch (e) {
      console.warn('Paese dalla posizione con Google fallito, uso OpenStreetMap', e)
    }
  }
  const t = await osmTownAt(pos)
  if (!t) throw new Error('Paese non trovato')
  return t
}

export const inBbox = ([lat, lng], [s, w, n, e]) => lat >= s && lat <= n && lng >= w && lng <= e
