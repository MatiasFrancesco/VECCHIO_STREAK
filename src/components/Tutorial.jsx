import { useEffect, useRef, useState } from 'react'
import { speak } from '../services/voice'

// Guida in 5 passi al primo avvio: una schermata alla volta, testo grande, letta ad alta voce.
const STEPS = [
  {
    icon: '🚸',
    title: 'Ciao! Sono Sicuro oggi',
    text: 'Ti accompagno a piedi e ti avviso prima di ogni strada pericolosa. Ti spiego come funziono in 5 passi.',
    demo: null,
  },
  {
    icon: '🏠',
    title: 'I tuoi posti',
    text: 'Salva casa, il supermercato, il dottore. Poi basta un tocco su «Torna a casa» per tornarci.',
    demo: (
      <div className="tut-mock-home">
        <span>🏠</span> Torna a casa
      </div>
    ),
  },
  {
    icon: '🎤',
    title: 'Dimmi dove vuoi andare',
    text: 'Premi il pulsante blu e parla, per esempio: «Portami in farmacia». Non serve scrivere.',
    demo: (
      <div className="tut-mock-mic">
        <span>🎤</span> Dove vuoi andare?
      </div>
    ),
  },
  {
    icon: '⚠️',
    title: 'Ti avviso prima del pericolo',
    text: 'Prima di un incrocio o di una strada trafficata il telefono parla e vibra. Quando vedi FERMATI in rosso, fermati e guarda a sinistra e a destra.',
    demo: (
      <div className="tut-mock-alerts">
        <div className="tut-mock-warn">Tra 40 metri</div>
        <div className="tut-mock-stop">🛑 FERMATI</div>
      </div>
    ),
  },
  {
    icon: '🔒',
    title: 'Sei al sicuro',
    text: 'I tuoi dati restano solo sul tuo telefono. Se hai bisogno di aiuto, il pulsante rosso SOS chiama il 112.',
    demo: <div className="tut-mock-sos">SOS</div>,
  },
]

export default function Tutorial({ onDone }) {
  const [i, setI] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const touchX = useRef(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  // Dopo il primo tocco il browser permette la voce: leggo ogni passo in automatico
  useEffect(() => {
    if (interacted) speak(`${step.title}. ${step.text}`)
  }, [i, interacted, step])

  function go(delta) {
    setInteracted(true)
    setI((n) => Math.min(STEPS.length - 1, Math.max(0, n + delta)))
  }

  function finish() {
    window.speechSynthesis?.cancel()
    onDone()
  }

  return (
    <div
      className="tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="Guida all'uso"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (dx < -50 && !last) go(1)
        if (dx > 50 && i > 0) go(-1)
        touchX.current = null
      }}
    >
      <div className="tut-top">
        <span className="tut-count">
          Passo {i + 1} di {STEPS.length}
        </span>
        {!last && (
          <button className="btn-link" onClick={finish}>
            Salta
          </button>
        )}
      </div>

      <div className="tut-body" aria-live="polite" key={i}>
        <div className="tut-icon" aria-hidden>
          {step.icon}
        </div>
        <h2>{step.title}</h2>
        <p>{step.text}</p>
        {step.demo && (
          <div className="tut-demo" aria-hidden>
            {step.demo}
          </div>
        )}
        <button
          className="btn btn-light tut-listen"
          onClick={() => {
            setInteracted(true)
            speak(`${step.title}. ${step.text}`)
          }}
        >
          🔊 Ascolta
        </button>
      </div>

      <div className="tut-dots" aria-hidden>
        {STEPS.map((_, n) => (
          <span key={n} className={n === i ? 'on' : ''} />
        ))}
      </div>

      <div className="row tut-nav">
        {i > 0 && (
          <button className="btn btn-light big" onClick={() => go(-1)}>
            ← Indietro
          </button>
        )}
        {last ? (
          <button className="btn btn-ok big" onClick={finish}>
            Iniziamo! ✓
          </button>
        ) : (
          <button className="btn btn-primary big" onClick={() => go(1)}>
            Avanti →
          </button>
        )}
      </div>
    </div>
  )
}
