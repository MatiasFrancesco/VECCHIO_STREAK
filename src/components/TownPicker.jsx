import { useState } from 'react'
import { searchTowns, townAt } from '../services/town'
import { speak } from '../services/voice'

function gpsOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS non disponibile'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      reject,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  })
}

// Scelta del paese di riferimento: dalla posizione del telefono o cercandolo per nome
export default function TownPicker({ current, welcome, onSelect, onClose }) {
  const [typed, setTyped] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  function choose(t) {
    onSelect(t)
    speak(`Perfetto: il tuo paese è ${t.name}.`)
  }

  async function fromGps() {
    setBusy('gps')
    setError('')
    try {
      choose(await townAt(await gpsOnce()))
    } catch (e) {
      setError(
        e?.code === 1
          ? 'Serve il permesso della posizione. Puoi anche scrivere il nome del paese.'
          : 'Non riesco a capire in che paese sei. Scrivi il nome qui sotto.'
      )
    } finally {
      setBusy('')
    }
  }

  async function search(e) {
    e.preventDefault()
    if (!typed.trim()) return
    setBusy('search')
    setError('')
    try {
      const list = await searchTowns(typed)
      setResults(list)
      if (!list.length) setError(`Non ho trovato "${typed}". Controlla come è scritto.`)
    } catch {
      setError('Ricerca non riuscita. Controlla la connessione e riprova.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="sheet-backdrop" onClick={welcome ? undefined : onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Il tuo paese">
        <h2>📍 In che paese cammini?</h2>
        <p className="lead">
          Cerco lì i tuoi posti, i cantieri e il meteo.
          {!welcome && (
            <>
              {' '}
              Adesso è: <strong>{current.name}</strong>.
            </>
          )}
        </p>

        <button className="btn btn-gps" onClick={fromGps} disabled={!!busy}>
          <span aria-hidden>📍</span>
          {busy === 'gps' ? 'Cerco dove sei…' : 'Usa la mia posizione'}
          <small>Trova il paese in cui ti trovi adesso</small>
        </button>

        <form className="typed" onSubmit={search}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="…oppure scrivi il nome del paese"
            aria-label="Nome del paese"
          />
          <button className="btn btn-primary" disabled={!!busy}>
            {busy === 'search' ? '…' : 'Cerca'}
          </button>
        </form>

        {error && <p className="msg msg-err">{error}</p>}

        {results?.length > 0 && (
          <ul className="town-list">
            {results.map((t) => (
              <li key={`${t.name}-${t.center.join(',')}`}>
                <button className="place-btn" onClick={() => choose(t)}>
                  <span className="place-icon" aria-hidden>
                    🏘️
                  </span>
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.label}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="row">
          <button className="btn btn-light big" onClick={onClose}>
            {welcome ? `Più tardi (resta ${current.name})` : 'Annulla'}
          </button>
        </div>
      </section>
    </div>
  )
}
