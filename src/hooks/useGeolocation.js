import { useEffect, useState } from 'react'

// Posizione GPS reale. Resta sul dispositivo: non viene mai inviata a server.
export function useGeolocation(enabled) {
  const [pos, setPos] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return
    if (!navigator.geolocation) {
      setError('GPS non disponibile')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude])
        setAccuracy(p.coords.accuracy)
        setError('')
      },
      (e) => setError(e.code === 1 ? 'Serve il permesso della posizione' : 'Posizione non disponibile'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled])

  return { pos, accuracy, error }
}
