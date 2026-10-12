import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WALK_SPEED_MS } from '../config'
import { pointAlong, polylineLength } from '../services/geo'

// Simula una persona che cammina lungo il percorso (per la demo al chiuso).
export function useDemoWalk(line, { running, speedFactor = 8 }) {
  const [along, setAlong] = useState(0)
  const lenRef = useRef(0)

  useEffect(() => {
    setAlong(0)
    lenRef.current = line ? polylineLength(line) : 0
  }, [line])

  useEffect(() => {
    if (!running || !line) return
    const tick = 250
    const id = setInterval(() => {
      setAlong((a) => Math.min(a + (WALK_SPEED_MS * speedFactor * tick) / 1000, lenRef.current))
    }, tick)
    return () => clearInterval(id)
  }, [running, line, speedFactor])

  const pos = useMemo(() => (line ? pointAlong(line, along) : null), [line, along])
  const reset = useCallback(() => setAlong(0), [])
  return { pos, along, reset }
}
