// Calcola i punti critici di un percorso pedonale:
//  - attraversamento di una strada principale (il percorso passa da un lato all'altro)
//  - tratti lungo una strada trafficata
//  - strisce pedonali e semafori sul percorso
//  - incidenti / cantieri / chiusure vicino al percorso
import { ALERT } from '../config'
import { distanceToPolyline, haversine, projector, samplePolyline, sideOfPolyline, pointAlong } from './geo'

const ROAD_BUFFER = 9 // metri: dentro questa distanza "sei sulla strada"
const ALONG_MIN = 60 // metri lungo una strada principale prima di avvisare

const ROAD_KIND = { trunk: 'superstrada', primary: 'strada statale', secondary: 'strada provinciale', tertiary: 'strada trafficata' }

function crossingsOfRoad(samples, road, proj) {
  const roadXY = road.geom.map(proj.toXY)
  const events = []
  let inside = false
  let entry = null
  let sideBefore = 0
  let prevSide = 0
  for (const s of samples) {
    const { d, side } = sideOfPolyline(proj.toXY(s.pos), roadXY)
    const nowInside = d < ROAD_BUFFER
    if (nowInside && !inside) {
      entry = s
      sideBefore = prevSide
    } else if (!nowInside && inside && entry) {
      const length = s.along - entry.along
      if (sideBefore && side && side !== sideBefore) {
        events.push({ type: 'attraversamento', along: entry.along + Math.min(length / 2, 8), road })
      } else if (length >= ALONG_MIN) {
        events.push({ type: 'lungo-strada', along: entry.along, length, road })
      }
      entry = null
    }
    inside = nowInside
    if (!nowInside) prevSide = side
  }
  if (inside && entry && samples.at(-1).along - entry.along >= ALONG_MIN) {
    events.push({ type: 'lungo-strada', along: entry.along, length: samples.at(-1).along - entry.along, road })
  }
  return events
}

export function computeCriticalPoints(route, { roads = [], nodes = [], hazards = [] }) {
  const line = route.line
  const proj = projector(line[0])
  const samples = samplePolyline(line, 3)
  const points = []

  // 1. Strade principali: attraversamenti e tratti lungo strada
  for (const road of roads) {
    for (const ev of crossingsOfRoad(samples, road, proj)) {
      const name = road.name
      const kind = ROAD_KIND[road.highway] || 'strada trafficata'
      if (ev.type === 'attraversamento') {
        points.push({
          type: 'attraversamento',
          along: ev.along,
          title: `Attraversi ${name}`,
          detail: `${kind[0].toUpperCase() + kind.slice(1)}: fermati sul bordo, guarda a sinistra e a destra.`,
          speech: `Attenzione. Tra poco devi attraversare ${name}, una ${kind}. Fermati sul bordo del marciapiede e guarda bene a sinistra e a destra.`,
          roadName: name,
        })
      } else {
        points.push({
          type: 'lungo-strada',
          along: ev.along,
          title: `Cammini lungo ${name}`,
          detail: `Per circa ${Math.round(ev.length / 10) * 10} metri: resta sul marciapiede, lontano dal bordo.`,
          speech: `Ora cammini lungo ${name} per circa ${Math.round(ev.length / 10) * 10} metri. Resta sul marciapiede, lontano dal bordo della strada.`,
          roadName: name,
        })
      }
    }
  }

  // 2. Strisce pedonali e semafori a meno di 12 m dal percorso
  for (const n of nodes) {
    const pos = [n.lat, n.lon]
    const { dist, along } = distanceToPolyline(pos, line, proj)
    if (dist > 12) continue
    const semaforo = n.highway === 'traffic_signals' || n.crossing === 'traffic_signals'
    // Se è vicino a un attraversamento già trovato, lo arricchisco invece di duplicarlo
    const near = points.find((p) => p.type === 'attraversamento' && Math.abs(p.along - along) < 25)
    if (near) {
      near.along = along
      near.title += semaforo ? ' (semaforo)' : ' (strisce)'
      near.speech += semaforo ? ' Aspetta il verde.' : ' Usa le strisce pedonali.'
      near.semaforo = semaforo
      continue
    }
    points.push({
      type: semaforo ? 'semaforo' : 'strisce',
      along,
      title: semaforo ? 'Semaforo pedonale' : 'Strisce pedonali',
      detail: semaforo ? 'Aspetta il verde e controlla che le auto si fermino.' : 'Attraversa solo quando le auto si sono fermate.',
      speech: semaforo
        ? 'Attenzione, tra poco c’è un semaforo. Aspetta il verde e controlla che le auto si siano fermate.'
        : 'Attenzione, tra poco ci sono le strisce pedonali. Attraversa solo quando le auto si sono fermate.',
    })
  }

  // 3. Incidenti, cantieri, chiusure vicino al percorso
  for (const h of hazards) {
    let best = { dist: Infinity, along: 0 }
    for (const p of h.line) {
      const r = distanceToPolyline(p, line, proj)
      if (r.dist < best.dist) best = r
    }
    if (best.dist > ALERT.routeBufferMeters) continue
    points.push({
      type: 'pericolo',
      kind: h.kind,
      along: best.along,
      title: h.label,
      detail: h.description,
      speech: `Attenzione: ${h.label.toLowerCase()} sul percorso. ${h.description}. Procedi con calma.`,
      hazardSource: h.source,
    })
  }

  // 4. Incroci: dove il percorso svolta (istruzioni di navigazione del routing)
  const length = samples.at(-1)?.along || 0
  for (const t of route.turns || []) {
    const { along } = distanceToPolyline(t.pos, line, proj)
    const lower = t.text[0].toLowerCase() + t.text.slice(1)
    if (along < 15 || length - along < 15) continue
    const near = points.find(
      (p) => ['attraversamento', 'strisce', 'semaforo'].includes(p.type) && Math.abs(p.along - along) < 25
    )
    // due svolte ravvicinate: un solo avviso "gira a destra, poi a sinistra"
    const prevTurn = points.find((p) => p.type === 'incrocio' && Math.abs(p.along - along) < 20)
    if (prevTurn) {
      prevTurn.title += `, poi ${lower.replace(/^gira /, '')}`
      prevTurn.speech = prevTurn.speech.replace('. Attenzione', `, poi ${lower}. Attenzione`)
      continue
    }
    if (near) {
      near.detail += ` Poi: ${lower}.`
      near.speech += ` Poi ${lower}.`
      continue
    }
    points.push({
      type: 'incrocio',
      along,
      title: `Incrocio: ${lower}`,
      detail: 'Attenzione alle auto che svoltano. Attraversa solo quando la strada è libera.',
      speech: `Tra poco c'è un incrocio. ${t.text}. Attenzione alle auto che svoltano: attraversa solo quando la strada è libera.`,
    })
  }

  // Ordina lungo il percorso, elimina i doppioni troppo vicini (stessa strada entro 25 m)
  points.sort((a, b) => a.along - b.along)
  const out = []
  for (const p of points) {
    const dup = out.find(
      (q) =>
        q.type === p.type &&
        Math.abs(q.along - p.along) < 25 &&
        (p.type === 'attraversamento' || (q.roadName || q.title) === (p.roadName || p.title))
    )
    // Incrocio tra due strade principali: un solo avviso che le nomina entrambe
    if (dup && p.type === 'attraversamento' && dup.roadName !== p.roadName && !dup.title.includes(p.roadName)) {
      dup.title = `Incrocio ${dup.roadName} / ${p.roadName}`
      dup.speech = `Attenzione. Tra poco arrivi all'incrocio tra ${dup.roadName} e ${p.roadName}. Fermati sul bordo del marciapiede e guarda bene a sinistra e a destra.`
    }
    if (!dup) out.push(p)
  }
  return out.map((p, i) => ({ ...p, id: `cp-${i}`, n: i + 1, pos: pointAlong(line, p.along) }))
}

export function hazardsOnRoute(points) {
  return points.filter((p) => p.type === 'pericolo')
}

export { haversine }
