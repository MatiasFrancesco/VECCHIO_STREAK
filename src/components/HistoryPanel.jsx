import { useState } from 'react'

const sameDay = (a, b) => a.toDateString() === b.toDateString()

function dayLabel(d) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(d, today)) return 'Oggi'
  if (sameDay(d, yesterday)) return 'Ieri'
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Cronologia dei posti raggiunti, raggruppata per giorno.
export default function HistoryPanel({ trips, onGo, onRemove, onClear, onClose }) {
  const [confirm, setConfirm] = useState(false)

  const groups = []
  for (const t of trips) {
    const label = dayLabel(new Date(t.date))
    const g = groups.at(-1)
    if (g?.label === label) g.items.push(t)
    else groups.push({ label, items: [t] })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Dove sono andato">
        <h2>🕘 Dove sono andato</h2>

        {!trips.length && (
          <p className="msg">Qui vedrai i posti che hai raggiunto con l’app. Per ora non ci sono viaggi.</p>
        )}

        {groups.map((g) => (
          <div key={g.label} className="history-day">
            <h3>{g.label}</h3>
            <ul className="history">
              {g.items.map((t) => (
                <li key={t.id}>
                  <div className="history-main">
                    <strong>🏁 {t.name}</strong>
                    <span>
                      ore {new Date(t.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {Math.round(t.meters / 10) * 10} m a piedi
                    </span>
                    {t.crossings > 0 && <span className="ok-text">✓ {t.crossings} punti pericolosi superati</span>}
                  </div>
                  <div className="history-actions">
                    <button className="btn btn-primary" onClick={() => onGo(t)}>
                      Vai di nuovo
                    </button>
                    <button className="btn-link" onClick={() => onRemove(t.id)} aria-label={`Cancella ${t.name}`}>
                      Cancella
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="privacy">
          🔒 La cronologia resta solo su questo telefono e non viene inviata a nessuno. Puoi cancellarla quando vuoi.
        </p>
        <div className="row">
          {trips.length > 0 &&
            (confirm ? (
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClear()
                  setConfirm(false)
                }}
              >
                Sì, cancella tutto
              </button>
            ) : (
              <button className="btn btn-light" onClick={() => setConfirm(true)}>
                Cancella tutto
              </button>
            ))}
          <button className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </section>
    </div>
  )
}
