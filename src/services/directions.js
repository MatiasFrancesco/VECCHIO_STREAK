// Ricerca e percorso con catena di riserva: Google -> TomTom -> OpenStreetMap.
// Se un servizio non risponde durante la passeggiata, l'app continua a funzionare.
import { CITY } from '../config'
import { googleGeocode, googleReverse, googleRoute, hasGoogle } from './google'
import { osmGeocode, osmReverse, osmRoute } from './osm'
import { hasTomTom, ttGeocode, ttRoute } from './tomtom'

const providers = (google, tomtom, osm) => [hasGoogle && google, hasTomTom && tomtom, osm].filter(Boolean)

export async function geocode(query, near = CITY.center) {
  const q = query.trim()
  if (!q) throw new Error('Destinazione vuota')
  for (const fn of providers(googleGeocode, ttGeocode, osmGeocode)) {
    try {
      const r = await fn(q, near)
      if (r) return r
    } catch (e) {
      console.warn(`Ricerca con ${fn.name} fallita`, e)
    }
  }
  throw new Error(`Non ho trovato "${q}"`)
}

export async function walkingRoute(from, to) {
  const list = providers(googleRoute, ttRoute, osmRoute)
  for (const [i, fn] of list.entries()) {
    try {
      return await fn(from, to)
    } catch (e) {
      if (i === list.length - 1) throw e
      console.warn(`Percorso con ${fn.name} fallito`, e)
    }
  }
}

// Posizione GPS -> indirizzo, per salvare "dove sono adesso"
export async function reverseGeocode(pos) {
  for (const fn of [hasGoogle && googleReverse, osmReverse].filter(Boolean)) {
    try {
      const r = await fn(pos)
      if (r) return r
    } catch (e) {
      console.warn(`Indirizzo con ${fn.name} fallito`, e)
    }
  }
  return { address: `Posizione ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`, pos }
}
