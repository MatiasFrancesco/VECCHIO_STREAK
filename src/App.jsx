import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MapView from './components/MapView'
import GoogleMapView from './components/GoogleMapView'
import MapErrorBoundary from './components/MapErrorBoundary'
import AlertBanner from './components/AlertBanner'
import ImpactPanel from './components/ImpactPanel'
import HistoryPanel from './components/HistoryPanel'
import PlacesPanel from './components/PlacesPanel'
import SavePlaceSheet from './components/SavePlaceSheet'
import { ALERT, CITY, WALK_SPEED_MS } from './config'
import { DEMO_HAZARDS } from './data/demoHazards'
import { useDemoWalk } from './hooks/useDemoWalk'
import { useGeolocation } from './hooks/useGeolocation'
import { useImpactStats } from './hooks/useImpactStats'
import { useProximityAlerts } from './hooks/useProximityAlerts'
import { useSavedPlaces } from './hooks/useSavedPlaces'
import { useTripHistory } from './hooks/useTripHistory'
import { cleanDestination, useSpeechInput } from './hooks/useSpeechInput'
import { computeCriticalPoints } from './services/criticalPoints'
import { bboxOf, haversine } from './services/geo'
import { streetFeatures } from './services/overpass'
import { geocode, walkingRoute } from './services/directions'
import { hasGoogle } from './services/google'
import { hasTomTom, trafficIncidents } from './services/tomtom'
import { ensureNotificationPermission, speak } from './services/voice'

// Punto di partenza della demo (casa della "signora Maria", a est della SP27)
const DEMO_START = [45.5505, 10.4245]
const QUICK = ['Municipio', 'Farmacia', 'Chiesa', 'Cimitero', 'Scuola']

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export default function App() {
  const [mode, setMode] = useState('demo') // 'demo' = cammino simulato, 'gps' = posizione reale
  const [hazards, setHazards] = useState([])
  const [hazardSource, setHazardSource] = useState('')
  const [destination, setDestination] = useState(null)
  const [route, setRoute] = useState(null)
  const [points, setPoints] = useState([])
  const [streetSource, setStreetSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [navigating, setNavigating] = useState(false)
  const [speedFactor, setSpeedFactor] = useState(5)
  const [hold, setHold] = useState(false) // demo: la persona si ferma al bordo finché non preme "Ho capito"
  const [showStats, setShowStats] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSave, setShowSave] = useState(null) // null | 'welcome' | 'new'
  const [showPlaces, setShowPlaces] = useState(false)
  const [preview, setPreview] = useState(null) // posto da confermare, mostrato sulla mappa
  const [googleFailed, setGoogleFailed] = useState(false)
  const useGoogleMap = hasGoogle && !googleFailed
  const onGoogleError = useCallback(() => {
    console.warn('Google Maps non disponibile: passo alla mappa OpenStreetMap')
    setGoogleFailed(true)
  }, [])
  const [typed, setTyped] = useState('')
  const lastReroute = useRef(0)

  const gps = useGeolocation(mode === 'gps')
  const { stats, add: addStats, reset: resetStats } = useImpactStats()
  const history = useTripHistory()
  const saved = useSavedPlaces()

  // Primo avvio: la prima cosa è salvare un posto (di solito casa)
  useEffect(() => {
    if (!saved.welcomeDone && !saved.places.length) setShowSave('welcome')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const demo = useDemoWalk(route?.line, { running: navigating && mode === 'demo' && !hold, speedFactor })

  const origin = mode === 'gps' ? gps.pos : DEMO_START
  const me = mode === 'gps' ? gps.pos : route ? demo.pos : DEMO_START

  // Traffico: incidenti, cantieri e chiusure attuali (TomTom), con fallback dimostrativo
  useEffect(() => {
    trafficIncidents(CITY.bbox)
      .then((live) => {
        if (live.length) {
          setHazards(live)
          setHazardSource(`${live.length} segnalazioni TomTom in tempo reale`)
        } else {
          setHazards(DEMO_HAZARDS)
          setHazardSource(hasTomTom ? 'Nessun cantiere live: segnalazioni demo' : 'Cantieri: segnalazioni demo')
        }
      })
      .catch(() => {
        setHazards(DEMO_HAZARDS)
        setHazardSource('TomTom non raggiungibile: dati demo')
      })
  }, [])

  const planRoute = useCallback(
    async (query, from = origin, { silent = false } = {}) => {
      if (!from) {
        setMessage('Sto cercando la tua posizione…')
        speak('Sto cercando la tua posizione. Attendi un momento.')
        return
      }
      setLoading(true)
      setNavigating(false)
      // "casa", "dal dottore" -> posto salvato, senza cercarlo su internet
      const savedMatch = typeof query === 'string' ? saved.findPlace(query) : null
      if (savedMatch) query = { name: savedMatch.label, to: savedMatch.to, address: savedMatch.address, pos: savedMatch.pos }
      const label = typeof query === 'string' ? query : query.name
      setMessage(`Cerco "${label}"…`)
      if (!silent) speak(`Cerco ${label}`)
      try {
        const dest = typeof query === 'string' ? await geocode(query, from) : query
        if (haversine(from, dest.pos) < 30) {
          const msg = `Sei già ${dest.to || `a ${dest.name}`}!`
          setMessage(msg)
          speak(msg)
          return
        }
        const r = await walkingRoute(from, dest.pos)
        const features = await streetFeatures(bboxOf(r.line, 60))
        const cps = computeCriticalPoints(r, { ...features, hazards })
        setDestination(dest)
        setRoute(r)
        setPoints(cps)
        setStreetSource(`${features.source} · percorso ${r.source}`)
        const minutes = Math.max(1, Math.round(r.meters / WALK_SPEED_MS / 60))
        const crossings = cps.filter((p) => p.type !== 'lungo-strada' && p.type !== 'pericolo').length
        const dangers = cps.filter((p) => p.type === 'pericolo')
        const summary =
          `Ti porto ${dest.to || `a ${dest.name}`}. Sono circa ${Math.round(r.meters / 10) * 10} metri, ${plural(minutes, 'minuto', 'minuti')} a piedi. ` +
          (crossings ? `${crossings === 1 ? "C'è un punto pericoloso" : `Ci sono ${crossings} punti pericolosi`} lungo la strada: ti avviserò prima di ognuno. ` : 'Il percorso non attraversa strade trafficate. ') +
          (dangers.length ? `Attenzione: sul percorso c'è ${dangers.map((d) => d.title.toLowerCase()).join(' e ')}. ` : '') +
          (silent ? '' : 'Quando sei pronto, premi Partiamo.')
        setMessage(summary)
        speak(summary)
        return r
      } catch (e) {
        const msg = e.message?.startsWith('Non ho trovato') ? e.message : 'Non riesco a calcolare il percorso. Riprova.'
        setMessage(msg)
        speak(msg + ' Prova a dirlo in un altro modo.')
      } finally {
        setLoading(false)
      }
    },
    [origin, hazards, saved.findPlace]
  )

  const openHistory = useCallback(() => {
    setShowHistory(true)
    const last = history.recentPlaces.slice(0, 3).map((p) => p.name)
    speak(
      last.length
        ? `Ultimamente sei andato a: ${last.join(', ')}. Per tornarci, premi Vai di nuovo.`
        : 'Non hai ancora fatto nessun viaggio con me.'
    )
  }, [history.recentPlaces])

  const voice = useSpeechInput((dest, raw) => {
    if (/dove sono (stat|andat)|cronologia|ultimi posti|i miei posti/i.test(raw)) return openHistory()
    if (dest) planRoute(dest)
  })

  const goAgain = useCallback(
    (place) => {
      setShowHistory(false)
      planRoute({ name: place.name, address: place.address, pos: place.pos })
    },
    [planRoute]
  )

  const onArrive = useCallback(
    ({ meters, crossings }) => {
      if (!destination) return
      history.addTrip({ name: destination.name, address: destination.address, pos: destination.pos, meters, crossings })
    },
    [destination, history.addTrip]
  )

  const onOffRoute = useCallback(
    (pos) => {
      if (mode !== 'gps' || !destination || Date.now() - lastReroute.current < 30000) return
      lastReroute.current = Date.now()
      speak('Sei uscito dal percorso. Ricalcolo la strada.')
      planRoute(destination, pos, { silent: true }).then((r) => r && setNavigating(true))
    },
    [mode, destination, planRoute]
  )

  const { alert, dismiss, progress, length } = useProximityAlerts({
    route,
    points,
    pos: me,
    active: navigating,
    onStats: addStats,
    onOffRoute,
    onArrive,
  })

  useEffect(() => setHold(alert?.level === 'stop'), [alert])

  const passedIds = useMemo(
    () => new Set(points.filter((p) => progress.along - p.along > ALERT.passedMeters).map((p) => p.id)),
    [points, progress.along]
  )

  async function start() {
    await ensureNotificationPermission()
    demo.reset()
    setNavigating(true)
    const first = points[0]
    speak(
      first
        ? `Partiamo. Il primo punto da fare con attenzione è: ${first.title}. Ti avviso quando ci sei vicino.`
        : 'Partiamo. Ti avviso se incontriamo un pericolo.'
    )
  }

  function stop() {
    setNavigating(false)
    setRoute(null)
    setPoints([])
    setDestination(null)
    setMessage('')
    window.speechSynthesis?.cancel()
  }

  function listen() {
    ensureNotificationPermission()
    speak('Dove vuoi andare?')
    // aspetto che la domanda finisca prima di aprire il microfono
    setTimeout(voice.start, 1300)
  }

  const goToSaved = (p) => planRoute({ name: p.label, to: p.to, address: p.address, pos: p.pos })
  const savedLabels = new Set(saved.places.map((p) => p.label.toLowerCase()))
  const recent = history.recentPlaces.filter((p) => !savedLabels.has(p.name.toLowerCase()))
  const home = saved.places.find((p) => p.key === 'casa')

  const mapProps = {
    hazards,
    route,
    points,
    me,
    follow: navigating,
    destination,
    passedIds,
    savedPlaces: saved.places,
    focus: preview,
  }
  const remaining = route ? Math.max(0, Math.round(length - progress.along)) : 0
  const nextPoint = navigating ? progress.next : points[0]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            🚸
          </span>
          <div>
            <h1>Attraversa Sicuro</h1>
            <small>{CITY.name} · pilota Comune di Gattapelata</small>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={openHistory} aria-label="Dove sono andato">
            🕘
          </button>
          <button className="icon-btn" onClick={() => setShowStats(true)} aria-label="I miei numeri">
            📊
          </button>
          <a className="icon-btn sos" href="tel:112" aria-label="Chiama il 112">
            SOS
          </a>
        </div>
      </header>

      <main className="map-wrap">
        <MapErrorBoundary fallback={<MapView {...mapProps} />} onError={onGoogleError}>
          {useGoogleMap ? <GoogleMapView {...mapProps} onAuthError={onGoogleError} /> : <MapView {...mapProps} />}
        </MapErrorBoundary>
        <div className="chips">
          <span className="chip">{hazardSource || 'Carico il traffico…'}</span>
          {streetSource && <span className="chip">{streetSource}</span>}
          {mode === 'gps' && gps.error && <span className="chip chip-err">{gps.error}</span>}
        </div>
        <AlertBanner alert={alert} onClose={dismiss} />
      </main>

      <section className="panel">
        {!route && (
          <>
            {saved.places.length === 0 ? (
              <button className="btn btn-save-first" onClick={() => setShowSave('new')}>
                <span aria-hidden>⭐</span>
                <span>
                  Salva la tua prima posizione
                  <small>casa, supermercato, dottore…</small>
                </span>
              </button>
            ) : (
              <div className="places">
                {home && (
                  <button className="place-btn place-home" onClick={() => goToSaved(home)} disabled={loading}>
                    <span className="place-icon" aria-hidden>
                      🏠
                    </span>
                    <span>
                      <strong>Torna a casa</strong>
                      <small>{home.address}</small>
                    </span>
                  </button>
                )}
                <div className="place-grid">
                  {saved.places
                    .filter((p) => p !== home)
                    .map((p) => (
                      <button key={p.id} className="place-btn" onClick={() => goToSaved(p)} disabled={loading}>
                        <span className="place-icon" aria-hidden>
                          {p.icon}
                        </span>
                        <span>
                          <strong>{p.label}</strong>
                        </span>
                      </button>
                    ))}
                  <button className="place-btn place-add" onClick={() => setShowSave('new')}>
                    <span className="place-icon" aria-hidden>
                      ➕
                    </span>
                    <span>
                      <strong>Salva posizione</strong>
                    </span>
                  </button>
                </div>
                <button className="btn-link" onClick={() => setShowPlaces(true)}>
                  Gestisci i miei posti
                </button>
              </div>
            )}
            <button
              className={`mic ${voice.listening ? 'mic-on' : ''}`}
              onClick={voice.listening ? voice.stop : listen}
              disabled={loading}
            >
              <span aria-hidden>{voice.listening ? '👂' : '🎤'}</span>
              {loading ? 'Cerco…' : voice.listening ? 'Ti ascolto…' : 'Dove vuoi andare?'}
            </button>
            {voice.transcript && <p className="heard">Ho sentito: “{voice.transcript}”</p>}
            {(voice.error || message) && <p className="msg">{voice.error || message}</p>}
            {recent.length > 0 && (
              <div className="recent">
                <h3>🕘 I tuoi posti</h3>
                {recent.slice(0, 3).map((p) => (
                  <button key={p.id} className="btn btn-recent" onClick={() => goAgain(p)} disabled={loading}>
                    <span>🏁 {p.name}</span>
                    <small>{p.visits > 1 ? `${p.visits} volte` : '1 volta'}</small>
                  </button>
                ))}
                {history.trips.length > 3 && (
                  <button className="btn-link" onClick={openHistory}>
                    Vedi tutta la cronologia →
                  </button>
                )}
              </div>
            )}
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} className="btn btn-light" onClick={() => planRoute(q)} disabled={loading}>
                  {q}
                </button>
              ))}
            </div>
            <form
              className="typed"
              onSubmit={(e) => {
                e.preventDefault()
                if (typed.trim()) planRoute(cleanDestination(typed))
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="…oppure scrivi qui la destinazione"
                aria-label="Destinazione"
              />
              <button className="btn btn-primary" disabled={loading}>
                Vai
              </button>
            </form>
          </>
        )}

        {route && (
          <>
            <div className="dest">
              <div>
                <small>Destinazione</small>
                <strong>🏁 {destination?.name}</strong>
              </div>
              <div className="dest-meta">
                <strong>{remaining} m</strong>
                <small>{Math.max(1, Math.round(remaining / WALK_SPEED_MS / 60))} min</small>
              </div>
            </div>

            {progress.arrived ? (
              <p className="next ok">✅ Sei arrivato in sicurezza! Il posto è salvato in «Dove sono andato».</p>
            ) : nextPoint ? (
              <p className="next">
                <span className="badge">{nextPoint.n}</span>
                <span>
                  {navigating ? `Tra ${progress.distToNext} m: ` : 'Primo punto: '}
                  <strong>{nextPoint.title}</strong>
                </span>
              </p>
            ) : (
              <p className="next ok">Nessun altro punto pericoloso fino all’arrivo.</p>
            )}

            {!navigating && message && <p className="msg">{message}</p>}

            <div className="row">
              {!navigating || progress.arrived ? (
                <button className="btn btn-primary big" onClick={progress.arrived ? stop : start}>
                  {progress.arrived ? 'Fine' : '▶ Partiamo'}
                </button>
              ) : (
                <button className="btn btn-light big" onClick={() => speak(progress.next?.speech || message)}>
                  🔊 Ripeti
                </button>
              )}
              <button className="btn btn-dark big" onClick={stop}>
                ✕ Annulla
              </button>
            </div>
          </>
        )}

        <details className="settings">
          <summary>Impostazioni demo</summary>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === 'demo'}
              onChange={() => {
                stop()
                setMode('demo')
              }}
            />{' '}
            Cammino simulato (presentazione)
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === 'gps'}
              onChange={() => {
                stop()
                setMode('gps')
              }}
            />{' '}
            GPS reale {mode === 'gps' && gps.accuracy ? `(±${Math.round(gps.accuracy)} m)` : ''}
          </label>
          {mode === 'demo' && (
            <label>
              Velocità simulazione: ×{speedFactor}
              <input
                type="range"
                min="1"
                max="20"
                value={speedFactor}
                onChange={(e) => setSpeedFactor(+e.target.value)}
              />
            </label>
          )}
        </details>
      </section>

      {showSave && (
        <SavePlaceSheet
          welcome={showSave === 'welcome'}
          near={origin || CITY.center}
          simulatedPos={mode === 'demo' ? DEMO_START : null}
          onPreview={setPreview}
          onSave={(p) => {
            saved.savePlace(p)
            setShowSave(null)
          }}
          onClose={() => {
            saved.finishWelcome()
            setShowSave(null)
          }}
        />
      )}
      {showPlaces && (
        <PlacesPanel
          places={saved.places}
          onRemove={saved.removePlace}
          onAdd={() => {
            setShowPlaces(false)
            setShowSave('new')
          }}
          onClose={() => setShowPlaces(false)}
        />
      )}
      {showHistory && (
        <HistoryPanel
          trips={history.trips}
          onGo={goAgain}
          onRemove={history.removeTrip}
          onClear={history.clear}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showStats && <ImpactPanel stats={stats} onClose={() => setShowStats(false)} onReset={resetStats} />}
    </div>
  )
}
