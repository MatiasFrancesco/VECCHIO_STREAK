import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWeather, simulateRain } from '../services/weather'

const REFRESH_MS = 10 * 60 * 1000

// Meteo della zona, aggiornato ogni 10 minuti.
// La posizione è arrotondata a ~1 km: il meteo non cambia ogni pochi passi e non rifacciamo richieste a ogni GPS.
export function useWeather(pos, { simulate = false } = {}) {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState('')
  const lat = pos ? pos[0].toFixed(2) : null
  const lng = pos ? pos[1].toFixed(2) : null

  const load = useCallback(async () => {
    if (lat == null) return
    try {
      setWeather(await getWeather([+lat, +lng]))
      setError('')
    } catch {
      setError('Meteo non disponibile')
    }
  }, [lat, lng])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const shown = useMemo(() => (simulate ? simulateRain(weather) : weather), [weather, simulate])
  return { weather: shown, error, refresh: load }
}
