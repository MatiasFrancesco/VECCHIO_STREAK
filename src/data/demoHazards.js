// Segnalazioni dimostrative per Prevalle: usate quando TomTom non restituisce nulla
// (frequente in un piccolo comune) o manca la chiave. Sono marcate come "demo".
export const DEMO_HAZARDS = [
  {
    id: 'demo-1',
    kind: 'cantiere',
    label: 'Cantiere',
    description: 'Lavori sul marciapiede in Via Alessandro Volta (SP27)',
    line: [[45.54862, 10.42185], [45.54895, 10.42236]],
    pos: [45.54878, 10.4221],
    source: 'demo',
  },
  {
    id: 'demo-2',
    kind: 'coda',
    label: 'Traffico intenso',
    description: 'Code in Via De Medici, auto in uscita dalla SS45bis',
    line: [[45.54712, 10.42495], [45.54745, 10.42565]],
    pos: [45.54728, 10.42531],
    source: 'demo',
  },
  {
    id: 'demo-3',
    kind: 'chiusura',
    label: 'Marciapiede chiuso',
    description: 'Marciapiede interrotto vicino al Municipio, attraversare con attenzione',
    line: [[45.5431, 10.42055], [45.54345, 10.4209]],
    pos: [45.54327, 10.42073],
    source: 'demo',
  },
]
