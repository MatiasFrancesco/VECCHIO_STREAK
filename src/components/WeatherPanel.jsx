import { speak } from '../services/voice'
import { weatherAdvice } from '../services/weather'

function Icon({ item, size }) {
  return item.iconUrl ? (
    <img src={item.iconUrl} alt="" width={size} height={size} />
  ) : (
    <span style={{ fontSize: size * 0.8 }} aria-hidden>
      {item.emoji}
    </span>
  )
}

// Meteo di oggi con consigli pratici e previsione delle prossime ore
export default function WeatherPanel({ weather, error, onClose }) {
  const tips = weatherAdvice(weather)

  function readAloud() {
    if (!weather) return
    const { now } = weather
    speak(`Adesso: ${now.desc}, ${now.temp} gradi. ${tips.map((t) => t.replace(/^\S+\s/, '')).join(' ')}`)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Meteo">
        <h2>Meteo di oggi</h2>

        {!weather && <p className="msg">{error || 'Carico il meteo…'}</p>}

        {weather && (
          <>
            <div className={`wx-now ${weather.now.wet || weather.rainSoon ? 'wx-rain' : ''}`}>
              <Icon item={weather.now} size={72} />
              <div>
                <strong className="wx-temp">{weather.now.temp}°</strong>
                <span className="wx-desc">{weather.now.desc}</span>
                <small>
                  Percepiti {weather.now.feels}° · vento {weather.now.wind} km/h · pioggia {weather.now.rainProb}%
                </small>
              </div>
            </div>

            <ul className="wx-tips">
              {tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>

            <h3 className="wx-h3">Prossime ore</h3>
            <ol className="wx-hours">
              {weather.hours.map((h) => (
                <li key={h.time} className={h.wet || h.rainProb >= 50 ? 'wet' : ''}>
                  <span className="wx-hour">{h.time}</span>
                  <Icon item={h} size={36} />
                  <strong>{h.temp}°</strong>
                  <span className="wx-prob">💧 {h.rainProb}%</span>
                </li>
              ))}
            </ol>
            <p className="privacy">Fonte: {weather.source}</p>
          </>
        )}

        <div className="row">
          <button className="btn btn-light" onClick={readAloud} disabled={!weather}>
            🔊 Ascolta
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </section>
    </div>
  )
}
