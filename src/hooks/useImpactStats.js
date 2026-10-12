import { useCallback, useState } from 'react'

// Contatori del "risultato misurabile" (Art. 2 e 5 del bando).
// Salvati solo sul telefono (localStorage): nessun database, nessun dato personale.
const KEY = 'attraversa-sicuro:impatto'
const EMPTY = { trips: 0, meters: 0, alerts: 0, crossings: 0, stops: 0, hazardsAvoided: 0, since: null }

function load() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...EMPTY }
  }
}

export function useImpactStats() {
  const [stats, setStats] = useState(load)
  const add = useCallback((delta) => {
    setStats((s) => {
      const next = { ...s, since: s.since || new Date().toISOString() }
      for (const [k, v] of Object.entries(delta)) next[k] = (next[k] || 0) + v
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* storage non disponibile: i numeri restano in memoria */
      }
      return next
    })
  }, [])
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setStats({ ...EMPTY })
  }, [])
  return { stats, add, reset }
}
