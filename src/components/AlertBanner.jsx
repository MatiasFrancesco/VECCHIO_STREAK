import { speak } from '../services/voice'

const ICON = { attraversamento: '🚸', strisce: '🚸', semaforo: '🚦', incrocio: '↪️', 'lungo-strada': '🚶', pericolo: '🚧' }

export default function AlertBanner({ alert, onClose }) {
  if (!alert) return null
  const { point, level, dist } = alert
  const stop = level === 'stop'
  return (
    <div className={`alert ${stop ? 'alert-stop' : 'alert-warn'}`} role="alert" aria-live="assertive">
      <div className="alert-icon" aria-hidden>
        {stop ? '🛑' : ICON[point.type] || '⚠️'}
      </div>
      <div className="alert-title">{stop ? 'FERMATI' : `Tra ${Math.max(5, dist)} metri`}</div>
      <div className="alert-sub">{point.title}</div>
      <p className="alert-detail">
        {stop ? 'Guarda a sinistra e a destra. Attraversa solo se non arrivano auto.' : point.detail}
      </p>
      <div className="alert-actions">
        <button className="btn btn-light" onClick={() => speak(point.speech)}>
          🔊 Ripeti
        </button>
        <button className="btn btn-dark" onClick={onClose}>
          Ho capito
        </button>
      </div>
    </div>
  )
}
