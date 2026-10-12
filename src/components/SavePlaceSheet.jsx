import { useEffect, useState } from 'react'
import { PLACE_PRESETS } from '../data/placePresets'
import { useSpeechInput } from '../hooks/useSpeechInput'
import { geocode, reverseGeocode } from '../services/directions'
import { speak } from '../services/voice'

// Rimuove "abito in", "è in", … da quello che la persona dice
const cleanAddress = (t) =>
  t
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/^(io\s+)?(abito|vivo|sto|si trova|è|il mio indirizzo è|l'indirizzo è)\s+(in|a|al|alla|nel|nella)?\s*/i, '')
    .trim()

function getGpsOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS non disponibile'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      reject,
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    )
  })
}

// Salvataggio guidato di un posto: 1) quale posto  2) dove si trova  3) conferma sulla mappa
export default function SavePlaceSheet({ welcome, near, city, simulatedPos, onPreview, onSave, onClose }) {
  const [step, setStep] = useState('what')
  const [preset, setPreset] = useState(null)
  const [customName, setCustomName] = useState('')
  const [typed, setTyped] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const name = preset?.key === 'altro' ? customName.trim() : preset?.label
  const nameLower = name ? name.toLowerCase() : ''

  // Mostra il posto proposto sulla mappa durante la conferma
  useEffect(() => {
    onPreview(step === 'confirm' && candidate ? { pos: candidate.pos, icon: preset?.icon || '📍' } : null)
  }, [step, candidate, preset, onPreview])
  useEffect(() => () => onPreview(null), [onPreview])

  function choose(p) {
    setPreset(p)
    setError('')
    if (p.key === 'altro') return
    setStep('where')
    speak(`Dove si trova ${p.key === 'casa' ? 'casa tua' : p.label.toLowerCase()}? Se ci sei adesso, premi Sono qui adesso.`)
  }

  function propose(c, note = '') {
    setCandidate({ ...c, note })
    setStep('confirm')
    speak(`È qui? ${c.address}. Se è giusto, premi Sì, salva.`)
  }

  async function useMyPosition() {
    setBusy('gps')
    setError('')
    try {
      let pos
      let note = ''
      try {
        pos = await getGpsOnce()
      } catch (e) {
        if (!simulatedPos) throw e
        // In modalità demo (al chiuso) usiamo la posizione simulata
        pos = simulatedPos
        note = 'Posizione simulata della demo (GPS non disponibile).'
      }
      propose(await reverseGeocode(pos), note)
    } catch (e) {
      setError(e?.code === 1 ? 'Serve il permesso della posizione. Puoi anche scrivere o dire l’indirizzo.' : 'Non riesco a trovare la tua posizione. Prova a scrivere o dire l’indirizzo.')
    } finally {
      setBusy('')
    }
  }

  async function searchAddress(text) {
    const q = cleanAddress(text)
    if (!q) return
    setBusy('search')
    setError('')
    try {
      const r = await geocode(q, near, city)
      // per un negozio o uno studio mostro anche il nome: "MD, Via Milano 4…"
      const withName = r.name && r.address && !r.address.startsWith(r.name) ? `${r.name}, ${r.address}` : r.address || r.name
      propose({ address: withName, pos: r.pos })
    } catch {
      setError(`Non ho trovato "${q}". Prova ad aggiungere il numero civico o il paese.`)
      speak('Non ho trovato questo indirizzo. Riprova.')
    } finally {
      setBusy('')
    }
  }

  const voice = useSpeechInput((_, raw) => searchAddress(raw))

  function save() {
    onSave({
      key: preset.key,
      label: name,
      icon: preset.icon,
      to: preset.to || `da ${name}`,
      address: candidate.address,
      pos: candidate.pos,
    })
    speak(
      `Fatto. Ho salvato ${preset.key === 'casa' ? 'casa tua' : nameLower}. Da ora ti basta premere il pulsante ${
        preset.key === 'casa' ? 'Torna a casa' : name
      }.`
    )
  }

  const compact = step === 'confirm'

  return (
    <div className={`sheet-backdrop ${compact ? 'see-through' : ''}`} onClick={compact ? undefined : onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Salva una posizione">
        {step === 'what' && (
          <>
            {welcome ? (
              <>
                <h2>👋 Benvenuto!</h2>
                <p className="lead">
                  Salva i posti dove vai più spesso: poi ti ci porto con <strong>un solo tocco</strong>. Cominciamo da
                  casa?
                </p>
              </>
            ) : (
              <h2>⭐ Salva una posizione</h2>
            )}
            <p className="step-q">Che posto vuoi salvare?</p>
            <div className="preset-grid">
              {PLACE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  className={`preset ${p.key === 'casa' ? 'preset-home' : ''} ${preset?.key === p.key ? 'selected' : ''}`}
                  onClick={() => choose(p)}
                >
                  <span aria-hidden>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
            {preset?.key === 'altro' && (
              <form
                className="typed"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (customName.trim()) setStep('where')
                }}
              >
                <input
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nome del posto (es. Bar Centrale)"
                  aria-label="Nome del posto"
                />
                <button className="btn btn-primary">Avanti</button>
              </form>
            )}
            <div className="row">
              <button className="btn btn-light big" onClick={onClose}>
                {welcome ? 'Più tardi' : 'Annulla'}
              </button>
            </div>
          </>
        )}

        {step === 'where' && (
          <>
            <h2>
              {preset.icon} Dove si trova {preset.key === 'casa' ? 'casa tua' : nameLower}?
            </h2>
            <button className="btn btn-gps" onClick={useMyPosition} disabled={!!busy}>
              <span aria-hidden>📍</span>
              {busy === 'gps' ? 'Cerco la tua posizione…' : 'Sono qui adesso'}
              <small>Usa la posizione del telefono</small>
            </button>
            <button
              className={`btn btn-voice ${voice.listening ? 'mic-on' : ''}`}
              onClick={voice.listening ? voice.stop : voice.start}
              disabled={busy === 'gps'}
            >
              <span aria-hidden>{voice.listening ? '👂' : '🎤'}</span>
              {voice.listening ? 'Ti ascolto… di’ l’indirizzo' : 'Dillo a voce'}
            </button>
            {voice.transcript && <p className="heard">Ho sentito: “{voice.transcript}”</p>}
            <form
              className="typed"
              onSubmit={(e) => {
                e.preventDefault()
                searchAddress(typed)
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="…oppure scrivi l’indirizzo (es. Via Morani 11)"
                aria-label="Indirizzo"
              />
              <button className="btn btn-primary" disabled={!!busy}>
                {busy === 'search' ? '…' : 'Cerca'}
              </button>
            </form>
            {(error || voice.error) && <p className="msg msg-err">{error || voice.error}</p>}
            <div className="row">
              <button className="btn btn-light big" onClick={() => setStep('what')}>
                ← Indietro
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && candidate && (
          <>
            <p className="step-q">
              {preset.icon} È qui {preset.key === 'casa' ? 'casa tua' : nameLower}?
            </p>
            <p className="candidate">{candidate.address}</p>
            {candidate.note && <p className="note">{candidate.note}</p>}
            <div className="row">
              <button className="btn btn-dark big" onClick={() => setStep('where')}>
                ✏️ No, cambia
              </button>
              <button className="btn btn-ok big" onClick={save}>
                ✅ Sì, salva
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
