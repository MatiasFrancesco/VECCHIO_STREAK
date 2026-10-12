// Parametri del pilota. Gattapelata è fittizia: la demo gira su Prevalle (BS).
export const CITY = {
  name: 'Prevalle',
  center: [45.545, 10.42],
  zoom: 16,
  // bbox [sud, ovest, nord, est] per geocoding e incidenti
  bbox: [45.521, 10.397, 45.568, 10.442],
}

export const GOOGLE_KEY = import.meta.env?.VITE_GOOGLE_MAPS_KEY || ''
// Map ID per i marker avanzati; DEMO_MAP_ID va bene per sviluppo e presentazione
export const GOOGLE_MAP_ID = import.meta.env?.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'
// Opzionale: solo per incidenti e cantieri in tempo reale
export const TOMTOM_KEY = import.meta.env?.VITE_TOMTOM_KEY || ''

export const ALERT = {
  warnMeters: 40, // primo avviso vocale
  stopMeters: 15, // "FERMATI"
  passedMeters: 12, // superato il punto di quanto, lo consideriamo attraversato
  routeBufferMeters: 25, // distanza massima dal percorso per considerare un pericolo
}

export const WALK_SPEED_MS = 1.0 // passo medio di una persona anziana (m/s)
