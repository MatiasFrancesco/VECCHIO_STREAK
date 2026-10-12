import { Component } from 'react'

// Se la mappa Google si rompe (chiave non valida, API non abilitate, rete), mostriamo la mappa
// OpenStreetMap invece di una pagina bianca: la persona in strada non deve restare senza avvisi.
export default class MapErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('Mappa Google non disponibile, passo a OpenStreetMap', error)
    this.props.onError?.()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
