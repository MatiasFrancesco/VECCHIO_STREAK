// "Risultato misurabile" richiesto dal bando: numeri calcolati sul telefono, senza database.
export default function ImpactPanel({ stats, onClose, onReset }) {
  const km = (stats.meters / 1000).toFixed(2)
  const rows = [
    ['🚸', stats.crossings, 'attraversamenti guidati in sicurezza'],
    ['🔔', stats.alerts, 'avvisi di pericolo ricevuti'],
    ['🛑', stats.stops, 'volte in cui ti abbiamo detto "Fermati"'],
    ['🚧', stats.hazardsAvoided, 'cantieri o incidenti segnalati sul percorso'],
    ['🚶', km, 'km percorsi a piedi'],
    ['🏁', stats.trips, 'arrivi a destinazione'],
  ]
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="I miei numeri">
        <h2>I miei numeri</h2>
        <ul className="stats">
          {rows.map(([icon, value, label]) => (
            <li key={label}>
              <span className="stat-icon" aria-hidden>
                {icon}
              </span>
              <strong>{value}</strong>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="privacy">
          🔒 Questi numeri restano solo sul tuo telefono. Nessun account, nessun database: la tua posizione non viene
          mai inviata a nessuno.
        </p>
        <div className="row">
          <button className="btn btn-light" onClick={onReset}>
            Azzera
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </section>
    </div>
  )
}
