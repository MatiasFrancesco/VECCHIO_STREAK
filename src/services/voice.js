// Voce (sintesi vocale), vibrazione e notifiche di sistema.

let itVoice = null
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  itVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('it')) || null
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

export function speak(text, { interrupt = true } = {}) {
  const synth = window.speechSynthesis
  if (!synth || !text) return
  if (interrupt) synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'it-IT'
  u.rate = 0.9 // più lento: pensato per persone anziane
  if (itVoice) u.voice = itVoice
  synth.speak(u)
}

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* non supportato */
  }
}

export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

export async function notify(title, body, { urgent = false } = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const options = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'attraversa-sicuro',
    renotify: true,
    requireInteraction: urgent,
    vibrate: urgent ? [400, 150, 400, 150, 400] : [250, 100, 250],
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification(title, options)
    new Notification(title, options)
  } catch {
    /* alcuni browser desktop non permettono Notification() diretto */
  }
}
