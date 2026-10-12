// Paese di riferimento predefinito: il comune pilota della demo (Gattapelata è fittizia).
// L'utente sceglie il proprio paese all'avvio o dalle impostazioni (hooks/useCity.js).
export const DEFAULT_CITY = {
  name: 'Prevalle',
  label: 'Prevalle BS',
  center: [45.545, 10.42],
  // bbox [sud, ovest, nord, est] per ricerca e incidenti
  bbox: [45.521, 10.397, 45.568, 10.442],
}

export const MAP_ZOOM = 16

// Strumenti di demo (cammino simulato, pioggia simulata, cantieri dimostrativi) solo in locale.
// In produzione l'app usa sempre la posizione reale e solo dati veri.
export const DEMO_ENABLED = !import.meta.env?.PROD
export const DEFAULT_MODE = DEMO_ENABLED ? 'demo' : 'gps'

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
