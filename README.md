# Attraversa Sicuro — MVP

PWA in React che accompagna a piedi le persone anziane e le avvisa (voce, vibrazione, notifica, avviso a tutto schermo) prima di ogni punto pericoloso: attraversamenti di strade principali, incroci, strisce, semafori, cantieri e incidenti. Pilota su Prevalle (BS) per il bando del Comune di Gattapelata. Nessun backend e nessun database.

Relazione tecnica: [docs/relazione-tecnica.md](docs/relazione-tecnica.md)

## Avvio

```bash
npm install
cp .env.example .env   # inserire VITE_GOOGLE_MAPS_KEY (e, se si vuole, VITE_TOMTOM_KEY)
npm run dev            # http://localhost:5173
```

### Chiave Google Maps

Nel progetto Google Cloud della chiave vanno abilitate tre API:
- **Maps JavaScript API**: mappa e strato del traffico;
- **Places API (New)**: ricerca della destinazione;
- **Routes API**: percorso a piedi.

Conviene limitare la chiave per *referrer HTTP* (`localhost:5173`, il dominio di produzione) e solo a queste tre API: in una PWA la chiave è visibile nel browser.

Google non espone come dati cantieri e incidenti. Per quelli si usa TomTom Traffic Incidents, se è presente `VITE_TOMTOM_KEY`; altrimenti l'app usa segnalazioni dimostrative.

**Riserva automatica:** se la chiave manca, non è valida o un'API non risponde, l'app passa da sola a OpenStreetMap (mappa Leaflet, ricerca Nominatim, percorso OSRM) senza interrompersi.

### Dal telefono (microfono e GPS richiedono HTTPS)

```bash
npm run dev:https
```

Apri `https://<IP-del-PC>:5173` dal telefono sulla stessa Wi‑Fi e accetta il certificato. Il riconoscimento vocale funziona in Chrome.

## Demo consigliata

1. Premi **Municipio** (oppure il microfono e di' «portami al municipio»).
2. Ascolta il riepilogo: distanza, punti pericolosi e cantieri sul percorso.
3. Premi **Partiamo**. In *Impostazioni demo* puoi regolare la velocità del cammino simulato.
4. A 40 m da ogni punto compare l'avviso giallo. Prima degli attraversamenti compare il rosso **FERMATI**, e il cammino resta fermo finché non premi «Ho capito».
5. All'arrivo il posto finisce in **🕘 Dove sono andato**. Nella schermata iniziale compare tra «I tuoi posti» (un tocco per tornarci). Si può chiedere anche a voce: «dove sono andato?».
6. Apri **📊** per vedere i numeri misurati (attraversamenti guidati, avvisi, km).

Per l'uso reale si passa a *GPS reale* nelle impostazioni.

## Struttura

- `src/services/criticalPoints.js` — motore dei punti critici
- `src/services/directions.js` — ricerca e percorso con catena Google → TomTom → OSM
- `src/services/google.js` — Places API (New) e Routes API
- `src/components/GoogleMapView.jsx` — mappa Google con strato traffico; `MapView.jsx` è la riserva Leaflet/OSM
- `src/services/tomtom.js` — incidenti e cantieri in tempo reale
- `src/services/overpass.js` — strade principali, strisce e semafori, con riserva sullo snapshot `src/data/prevalleOsm.json`
- `src/hooks/useProximityAlerts.js` — logica degli avvisi
- `src/hooks/useSpeechInput.js` — comando vocale
- `src/hooks/useTripHistory.js` + `src/components/HistoryPanel.jsx` — cronologia dei posti (solo sul dispositivo)
