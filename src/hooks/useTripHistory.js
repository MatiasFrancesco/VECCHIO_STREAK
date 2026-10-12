import { useCallback, useMemo, useState } from 'react'

// Cronologia dei posti raggiunti. Salvata solo sul telefono (localStorage):
// nessun server la riceve e l'utente può cancellarla in ogni momento.
const KEY = 'attraversa-sicuro:cronologia'
const MAX = 50

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage non disponibile: la cronologia resta in memoria */
  }
}

export function useTripHistory() {
  const [trips, setTrips] = useState(load)

  const addTrip = useCallback((trip) => {
    setTrips((list) => {
      const next = [{ id: `${Date.now()}`, date: new Date().toISOString(), ...trip }, ...list].slice(0, MAX)
      save(next)
      return next
    })
  }, [])

  const removeTrip = useCallback((id) => {
    setTrips((list) => {
      const next = list.filter((t) => t.id !== id)
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    save([])
    setTrips([])
  }, [])

  // Posti distinti, dal più recente: per i pulsanti "Vai di nuovo"
  const recentPlaces = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const t of trips) {
      const key = `${t.name}|${t.pos?.map((v) => v.toFixed(4)).join(',')}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ...t, visits: trips.filter((x) => x.name === t.name).length })
    }
    return out
  }, [trips])

  return { trips, recentPlaces, addTrip, removeTrip, clear }
}
