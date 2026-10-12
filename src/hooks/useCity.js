import { useCallback, useState } from 'react'
import { DEFAULT_CITY } from '../config'

// Paese di riferimento scelto dall'utente, salvato solo sul telefono.
// Finché non lo sceglie si usa il comune pilota della demo.
const KEY = 'attraversa-sicuro:paese'

function load() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY))
    return c?.center && c?.bbox ? c : null
  } catch {
    return null
  }
}

export function useCity() {
  const [saved, setSaved] = useState(load)

  const setCity = useCallback((city) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(city))
    } catch {
      /* storage non disponibile: vale fino alla chiusura dell'app */
    }
    setSaved(city)
  }, [])

  return { city: saved || DEFAULT_CITY, chosen: Boolean(saved), setCity }
}
