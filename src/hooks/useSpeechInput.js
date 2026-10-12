import { useCallback, useEffect, useRef, useState } from 'react'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const speechSupported = Boolean(SR)

// "Portami alla farmacia per favore" -> "farmacia"
export function cleanDestination(text) {
  return text
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/\s*(per favore|grazie)$/i, '')
    .replace(
      /^(per favore\s+)?(mi\s+)?(portami|riportami|accompagnami|torna|tornare|voglio tornare|voglio andare|vorrei andare|devo andare|vado|andiamo|andare|portare)\s+/i,
      ''
    )
    .replace(/^(a|al|alla|allo|ai|alle|all'|in|nel|nella|da|dal|dalla|verso|fino a|fino al|fino alla)\s+/i, '')
    .trim()
}

export function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const cbRef = useRef(onResult)
  useEffect(() => {
    cbRef.current = onResult
  }, [onResult])

  const start = useCallback(() => {
    if (!SR) {
      setError('Il riconoscimento vocale non è disponibile su questo browser. Usa Chrome.')
      return
    }
    recRef.current?.abort()
    const rec = new SR()
    rec.lang = 'it-IT'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false
    let done = false
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setTranscript(text)
      if (e.results[e.results.length - 1].isFinal && !done) {
        done = true
        cbRef.current?.(cleanDestination(text), text)
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech') setError('Non ho sentito nulla. Riprova parlando vicino al telefono.')
      else if (e.error === 'not-allowed') setError('Serve il permesso del microfono.')
      else setError('Non ho capito, riprova.')
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setError('')
    setTranscript('')
    setListening(true)
    rec.start()
  }, [])

  const stop = useCallback(() => recRef.current?.stop(), [])

  return { listening, transcript, error, start, stop, supported: speechSupported }
}
