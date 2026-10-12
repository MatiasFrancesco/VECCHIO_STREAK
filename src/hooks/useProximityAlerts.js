import { useEffect, useMemo, useRef, useState } from 'react'
import { ALERT } from '../config'
import { distanceToPolyline, polylineLength, projector } from '../services/geo'
import { notify, speak, vibrate } from '../services/voice'

const STOP_TYPES = new Set(['attraversamento', 'strisce', 'semaforo'])
const CROSSING_TYPES = new Set([...STOP_TYPES, 'incrocio'])

// Segue la posizione lungo il percorso e lancia gli avvisi:
//  - a 40 m: avviso giallo + voce + notifica
//  - a 15 m (solo attraversamenti): "FERMATI" rosso + vibrazione forte
//  - superato il punto: conteggiato come attraversamento sicuro
export function useProximityAlerts({ route, points, pos, active, onStats, onOffRoute, onArrive }) {
  const [alert, setAlert] = useState(null)
  const [progress, setProgress] = useState({ along: 0, next: null, distToNext: null, arrived: false })
  const state = useRef({})
  const lastAlong = useRef(0)
  const proj = useMemo(() => (route ? projector(route.line[0]) : null), [route])
  const length = useMemo(() => (route ? polylineLength(route.line) : 0), [route])

  // Nuovo percorso: azzera lo stato degli avvisi
  useEffect(() => {
    state.current = {}
    lastAlong.current = 0
    setAlert(null)
    setProgress({ along: 0, next: null, distToNext: null, arrived: false })
  }, [route])

  useEffect(() => {
    if (!active || !route || !pos || !proj) return
    const { dist: offRoute, along } = distanceToPolyline(pos, route.line, proj)

    if (offRoute > 45) onOffRoute?.(pos)

    // metri percorsi (solo in avanti, evita il rumore del GPS)
    const delta = along - lastAlong.current
    if (delta > 0 && delta < 60) onStats({ meters: delta })
    if (delta > 0) lastAlong.current = along

    let next = null
    for (const p of points) {
      const s = (state.current[p.id] ||= {})
      const d = p.along - along
      if (d < -ALERT.passedMeters) {
        if (s.warned && !s.passed) {
          s.passed = true
          if (CROSSING_TYPES.has(p.type)) onStats({ crossings: 1 })
          if (p.type === 'pericolo') onStats({ hazardsAvoided: 1 })
          setAlert((a) => (a?.point.id === p.id ? null : a))
        }
        continue
      }
      if (!next) next = { point: p, dist: Math.max(0, d) }
      if (d <= ALERT.warnMeters && !s.warned) {
        s.warned = true
        onStats({ alerts: 1 })
        setAlert({ point: p, level: 'warn', dist: Math.round(d) })
        speak(p.speech)
        vibrate([250, 100, 250])
        notify(`⚠️ ${p.title}`, `Tra ${Math.max(5, Math.round(d))} metri. ${p.detail}`)
      }
      if (d <= ALERT.stopMeters && STOP_TYPES.has(p.type) && !s.stopped) {
        s.stopped = true
        onStats({ stops: 1 })
        setAlert({ point: p, level: 'stop', dist: Math.round(d) })
        speak(
          p.semaforo || p.type === 'semaforo'
            ? 'Fermati. Aspetta il verde. Poi guarda a sinistra e a destra.'
            : 'Fermati. Guarda a sinistra, poi a destra, poi ancora a sinistra. Attraversa solo se non arrivano auto.'
        )
        vibrate([500, 150, 500, 150, 500])
        notify(`🛑 FERMATI — ${p.title}`, 'Guarda a sinistra e a destra prima di attraversare.', { urgent: true })
      }
    }

    const arrived = length - along < 12
    if (arrived && !state.current.arrived) {
      state.current.arrived = true
      onStats({ trips: 1 })
      onArrive?.({ meters: length, crossings: points.filter((p) => CROSSING_TYPES.has(p.type)).length })
      speak('Sei arrivato a destinazione, in sicurezza.')
      notify('✅ Sei arrivato', 'Hai raggiunto la destinazione in sicurezza.')
      setAlert(null)
    }
    setProgress({ along, next: next?.point || null, distToNext: next ? Math.round(next.dist) : null, arrived })
  }, [pos, active, route, points, proj, length, onStats, onOffRoute, onArrive])

  return { alert, dismiss: () => setAlert(null), progress, length }
}
