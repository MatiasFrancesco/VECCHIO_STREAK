// Meteo: Google Weather API, con riserva gratuita Open-Meteo.
// Serve per avvisare in caso di pioggia: marciapiedi scivolosi, auto che frenano più tardi,
// meno visibilità agli attraversamenti.
import { GOOGLE_KEY } from '../config'
import { hasGoogle } from './google'
import { getJson } from './http'

const RAIN_PROB = 50 // % oltre cui consideriamo "pioggia in arrivo"

// Tipi di tempo Google che significano precipitazioni
const WET = /RAIN|SHOWER|THUNDER|HAIL|SNOW|SLEET/
const EMOJI = [
  [/THUNDER/, '⛈️'],
  [/SNOW|SLEET/, '🌨️'],
  [/HAIL/, '🌨️'],
  [/RAIN|SHOWER/, '🌧️'],
  [/WIND/, '💨'],
  [/^CLEAR/, '☀️'],
  [/MOSTLY_CLEAR/, '🌤️'],
  [/PARTLY/, '⛅'],
  [/CLOUDY/, '☁️'],
  [/FOG|HAZE/, '🌫️'],
]
const emojiFor = (type = '') => EMOJI.find(([re]) => re.test(type))?.[1] || '🌡️'

function rainSoon(hours) {
  const h = hours.find((x) => x.wet || x.rainProb >= RAIN_PROB)
  return h ? { at: h.time, prob: h.rainProb } : null
}

// ---------- Google Weather API ----------
async function googleWeather([lat, lng]) {
  const q = `key=${GOOGLE_KEY}&location.latitude=${lat}&location.longitude=${lng}&languageCode=it`
  const [cur, fc] = await Promise.all([
    getJson(`https://weather.googleapis.com/v1/currentConditions:lookup?${q}`),
    getJson(`https://weather.googleapis.com/v1/forecast/hours:lookup?${q}&hours=6`),
  ])
  const type = cur.weatherCondition?.type || ''
  const now = {
    temp: Math.round(cur.temperature.degrees),
    feels: Math.round(cur.feelsLikeTemperature?.degrees ?? cur.temperature.degrees),
    desc: cur.weatherCondition?.description?.text || '',
    emoji: emojiFor(type),
    iconUrl: cur.weatherCondition?.iconBaseUri ? `${cur.weatherCondition.iconBaseUri}.svg` : null,
    rainProb: cur.precipitation?.probability?.percent ?? 0,
    wet: WET.test(type) || (cur.precipitation?.qpf?.quantity ?? 0) > 0.1,
    wind: Math.round(cur.wind?.speed?.value ?? 0),
  }
  const hours = (fc.forecastHours || []).map((h) => {
    const t = h.weatherCondition?.type || ''
    return {
      time: `${String(h.displayDateTime.hours).padStart(2, '0')}:00`,
      temp: Math.round(h.temperature.degrees),
      desc: h.weatherCondition?.description?.text || '',
      emoji: emojiFor(t),
      iconUrl: h.weatherCondition?.iconBaseUri ? `${h.weatherCondition.iconBaseUri}.svg` : null,
      rainProb: h.precipitation?.probability?.percent ?? 0,
      wet: WET.test(t),
    }
  })
  return { source: 'Google Weather', now, hours, rainSoon: rainSoon(hours) }
}

// ---------- Open-Meteo (riserva, senza chiave) ----------
// Codici WMO -> descrizione italiana + emoji
function wmo(code) {
  if (code === 0) return ['Sereno', '☀️', false]
  if (code <= 2) return ['Poco nuvoloso', '🌤️', false]
  if (code === 3) return ['Nuvoloso', '☁️', false]
  if (code <= 48) return ['Nebbia', '🌫️', false]
  if (code <= 57) return ['Pioviggine', '🌦️', true]
  if (code <= 67) return ['Pioggia', '🌧️', true]
  if (code <= 77) return ['Neve', '🌨️', true]
  if (code <= 82) return ['Rovesci di pioggia', '🌧️', true]
  if (code <= 86) return ['Rovesci di neve', '🌨️', true]
  return ['Temporale', '⛈️', true]
}

async function openMeteo([lat, lng]) {
  const j = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,precipitation_probability,weather_code&forecast_hours=7&timezone=auto`
  )
  const [desc, emoji, wet] = wmo(j.current.weather_code)
  const now = {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    desc,
    emoji,
    iconUrl: null,
    rainProb: j.hourly.precipitation_probability?.[0] ?? 0,
    wet: wet || j.current.precipitation > 0.1,
    wind: Math.round(j.current.wind_speed_10m),
  }
  const hours = j.hourly.time.slice(1, 7).map((t, i) => {
    const [d, e, w] = wmo(j.hourly.weather_code[i + 1])
    return {
      time: t.slice(11, 16),
      temp: Math.round(j.hourly.temperature_2m[i + 1]),
      desc: d,
      emoji: e,
      iconUrl: null,
      rainProb: j.hourly.precipitation_probability[i + 1] ?? 0,
      wet: w,
    }
  })
  return { source: 'Open-Meteo', now, hours, rainSoon: rainSoon(hours) }
}

export async function getWeather(pos) {
  if (hasGoogle) {
    try {
      return await googleWeather(pos)
    } catch (e) {
      console.warn('Google Weather non disponibile, uso Open-Meteo', e)
    }
  }
  return openMeteo(pos)
}

// Pioggia simulata per la presentazione (impostazioni demo)
export function simulateRain(w) {
  if (!w) return w
  const hours = w.hours.map((h, i) => (i < 3 ? { ...h, desc: 'Pioggia', emoji: '🌧️', iconUrl: null, rainProb: 90, wet: true } : h))
  return {
    ...w,
    source: `${w.source} · pioggia simulata`,
    now: { ...w.now, desc: 'Pioggia moderata', emoji: '🌧️', iconUrl: null, rainProb: 90, wet: true },
    hours,
    rainSoon: { at: hours[0].time, prob: 90 },
  }
}

// Consigli pratici per una persona anziana, in base al tempo
export function weatherAdvice(w) {
  if (!w) return []
  const { now, rainSoon: soon } = w
  const tips = []
  if (now.wet) {
    tips.push('🌧️ Sta piovendo: porta l’ombrello e scarpe che non scivolano.')
    tips.push('🚗 Con la pioggia le auto frenano più tardi: attraversa con ancora più calma.')
  } else if (soon) {
    tips.push(`☂️ Possibile pioggia verso le ${soon.at} (${soon.prob}%): porta l’ombrello.`)
  }
  if (now.feels >= 30) tips.push('🥵 Fa molto caldo: porta l’acqua ed evita le ore centrali.')
  if (now.feels <= 3) tips.push('🧊 Fa freddo: attenzione al ghiaccio sui marciapiedi.')
  if (now.wind >= 40) tips.push('💨 C’è vento forte: tieniti lontano da alberi e impalcature.')
  if (!tips.length) tips.push('😊 Il tempo è buono per una passeggiata.')
  return tips
}

// Frase breve per la voce, usata quando si calcola il percorso
export function rainWarning(w) {
  if (!w) return ''
  if (w.now.wet) return 'Attenzione: sta piovendo. Il marciapiede può essere scivoloso e le auto frenano più tardi. Porta l’ombrello e attraversa con calma.'
  if (w.rainSoon) return `Attenzione: verso le ${w.rainSoon.at} potrebbe piovere. Porta l’ombrello.`
  return ''
}
