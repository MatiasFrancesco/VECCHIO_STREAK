// Tipi di posto che si possono salvare. `to` serve per parlare in italiano corretto:
// "Ti porto a casa", "Ti porto dal dottore", …
export const PLACE_PRESETS = [
  { key: 'casa', label: 'Casa', icon: '🏠', to: 'a casa' },
  { key: 'supermercato', label: 'Supermercato', icon: '🛒', to: 'al supermercato' },
  { key: 'dottore', label: 'Dottore', icon: '🩺', to: 'dal dottore' },
  { key: 'farmacia', label: 'Farmacia', icon: '💊', to: 'in farmacia' },
  { key: 'famiglia', label: 'Famiglia', icon: '👪', to: 'dalla famiglia' },
  { key: 'chiesa', label: 'Chiesa', icon: '⛪', to: 'in chiesa' },
  { key: 'altro', label: 'Altro', icon: '📍' },
]
