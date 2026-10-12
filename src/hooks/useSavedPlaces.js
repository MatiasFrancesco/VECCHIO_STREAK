import { useCallback, useState } from 'react'

// Posti salvati dall'utente (casa, supermercato, dottore, …).
// Restano solo sul telefono (localStorage), come cronologia e contatori.
const KEY = 'attraversa-sicuro:posti'
const DONE = 'attraversa-sicuro:benvenuto-fatto'

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage non disponibile: i dati restano in memoria */
  }
}

// Casa sempre per prima: è il posto in cui si torna più spesso
const sortPlaces = (list) => [...list].sort((a, b) => (b.key === 'casa') - (a.key === 'casa'))

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\b(mia|mio|di|del|della)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function useSavedPlaces() {
  const [places, setPlaces] = useState(() => sortPlaces(read(KEY, [])))
  const [welcomeDone, setWelcomeDone] = useState(() => read(DONE, false))

  const savePlace = useCallback((place) => {
    setPlaces((list) => {
      // Un solo posto per tipo predefinito (una sola "Casa"); gli "Altro" si distinguono per nome
      const same = (p) => (place.key !== 'altro' ? p.key === place.key : norm(p.label) === norm(place.label))
      const next = sortPlaces([...list.filter((p) => !same(p)), { id: `${Date.now()}`, ...place }])
      write(KEY, next)
      return next
    })
    write(DONE, true)
    setWelcomeDone(true)
  }, [])

  const removePlace = useCallback((id) => {
    setPlaces((list) => {
      const next = list.filter((p) => p.id !== id)
      write(KEY, next)
      return next
    })
  }, [])

  const finishWelcome = useCallback(() => {
    write(DONE, true)
    setWelcomeDone(true)
  }, [])

  // "casa", "casa mia", "dottore" -> posto salvato corrispondente
  const findPlace = useCallback(
    (query) => {
      const q = norm(query)
      if (!q) return null
      return places.find((p) => norm(p.label) === q) || places.find((p) => q.includes(norm(p.label))) || null
    },
    [places]
  )

  return { places, savePlace, removePlace, findPlace, welcomeDone, finishWelcome }
}
