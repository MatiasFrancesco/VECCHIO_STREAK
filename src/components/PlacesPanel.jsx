import { useState } from 'react'

// Elenco dei posti salvati con possibilità di cancellarli (con conferma: niente tocchi accidentali)
export default function PlacesPanel({ places, onRemove, onAdd, onClose }) {
  const [confirmId, setConfirmId] = useState(null)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="I miei posti">
        <h2>⭐ I miei posti</h2>
        <ul className="history">
          {places.map((p) => (
            <li key={p.id}>
              <div className="history-main">
                <strong>
                  {p.icon} {p.label}
                </strong>
                <span>{p.address}</span>
              </div>
              <div className="history-actions">
                {confirmId === p.id ? (
                  <>
                    <button className="btn btn-light" onClick={() => setConfirmId(null)}>
                      No
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        onRemove(p.id)
                        setConfirmId(null)
                      }}
                    >
                      Sì, elimina
                    </button>
                  </>
                ) : (
                  <button className="btn-link" onClick={() => setConfirmId(p.id)}>
                    Elimina
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="privacy">🔒 I tuoi posti restano solo su questo telefono.</p>
        <div className="row">
          <button className="btn btn-light" onClick={onAdd}>
            ➕ Aggiungi
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </section>
    </div>
  )
}
