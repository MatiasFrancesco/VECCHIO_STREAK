# Relazione tecnica — "Attraversa Sicuro"

**Bando di gara del Comune di Gattapelata — App per l'attraversamento stradale sicuro degli anziani**
Procedura aperta del 06/10/2026 · Offerta presentata il 12/10/2026

---

## 1. Sintesi della proposta

*Attraversa Sicuro* è un'app che accompagna a piedi la persona anziana, la guida con la voce e **la avvisa prima di ogni punto pericoloso** del percorso:
- attraversamenti di strade principali
- incroci
- strisce pedonali
- semafori
- cantieri, incidenti e marciapiedi chiusi

L'utente non deve saper usare una mappa né scrivere. Preme un solo grande pulsante e dice *«Portami in farmacia»*. Al resto pensa l'app:
- calcola il percorso pedonale;
- individua i punti critici;
- durante il cammino, prima di ognuno, parla, vibra e mostra un avviso a tutto schermo. A 15 metri da un attraversamento dice **«FERMATI. Guarda a sinistra e a destra»**.

È una **Progressive Web App**: si installa in pochi secondi da un link o da un QR code, senza passare dagli app store. Funziona sui telefoni Android e iOS già posseduti dai cittadini. **Non richiede alcun intervento sui vicoli del centro storico**, che restano «così come attualmente sono» (Art. 2).

## 2. Come funziona

| Fase | Cosa vede/sente l'anziano | Cosa fa l'app |
|---|---|---|
| 1. Destinazione | «Dove vuoi andare?» → dice «al Municipio» | Riconoscimento vocale in italiano (Web Speech API). Pulisce la frase («portami al…») e cerca il luogo (Google Places, con riserva su TomTom e OpenStreetMap) |
| 2. Percorso | «Ti porto al Municipio. Sono 1.160 metri, 19 minuti. Ci sono 5 punti pericolosi: ti avviserò prima di ognuno. Attenzione: c'è un marciapiede chiuso.» | Percorso pedonale (Google Routes API, con riserva TomTom/OSRM) e calcolo dei punti critici (§3) |
| 3. Cammino | Mappa semplice con il percorso blu e punti numerati | Posizione GPS letta solo sul telefono |
| 4. A 40 m da un punto critico | Avviso giallo a tutto schermo, voce, vibrazione, notifica | «Tra poco devi attraversare Via Volta, una strada trafficata…» |
| 5. A 15 m da un attraversamento | **FERMATI** rosso lampeggiante, vibrazione forte | «Fermati. Guarda a sinistra, poi a destra, poi ancora a sinistra.» |
| 6. Punto superato | Il numero diventa una ✓ verde | Conteggio dell'attraversamento sicuro (§5) |
| 7. Fuori percorso | «Sei uscito dal percorso, ricalcolo la strada.» | Nuovo percorso automatico |
| 8. Arrivo | «Sei arrivato a destinazione, in sicurezza.» | Il viaggio viene registrato |

Sempre visibili: il pulsante **SOS** (chiamata al 112), la sezione **«I miei numeri»** e la cronologia **«Dove sono andato»**.

**I miei posti.** Al primo avvio l'app chiede di salvare il primo posto, di solito casa.
- Si sceglie tra tipi predefiniti (casa, supermercato, dottore, farmacia, famiglia, chiesa) o si dà un nome libero.
- L'indirizzo si può indicare in tre modi:
  - con **«Sono qui adesso»**: il GPS legge la posizione e l'app la traduce in indirizzo;
  - dicendolo a voce;
  - scrivendolo.
- La conferma avviene sulla mappa.
- **«Torna a casa»** diventa il pulsante più grande della schermata principale. Ogni posto salvato si raggiunge con un tocco o a voce («portami dal dottore»), senza ricerche.

**Cronologia dei posti.** Ogni arrivo viene salvato con data, ora, metri percorsi e punti pericolosi superati.
- Nella schermata iniziale i posti più frequenti diventano pulsanti **«I tuoi posti»**: per tornare in farmacia basta un tocco, senza parlare né scrivere.
- Dalla cronologia, **«Vai di nuovo»** ricalcola il percorso dalla posizione attuale.
- Si può chiedere anche a voce: *«Dove sono andato?»*. L'app legge gli ultimi posti.

## 3. Individuazione dei punti critici

Il motore (`src/services/criticalPoints.js`) combina quattro fonti lungo il percorso pedonale.

1. **Attraversamento di strade principali**
   - Si usano le strade statali, provinciali e trafficate di OpenStreetMap: trunk, primary, secondary, tertiary.
   - Il percorso viene campionato ogni 3 m.
   - Si rileva quando il pedone **passa da un lato all'altro** della carreggiata: entra nella fascia di 9 m attorno all'asse stradale ed esce dal lato opposto.
   - In questo modo l'avviso scatta per l'attraversamento vero, non per ogni strada vicina.
   - Due strade principali nello stesso punto diventano un unico avviso «Incrocio Via X / Via Y».
2. **Cammino lungo strade trafficate**: oltre 60 m in fascia stretta producono l'avviso «resta sul marciapiede, lontano dal bordo».
3. **Strisce pedonali e semafori** (OSM `highway=crossing` / `traffic_signals`) entro 12 m dal percorso.
   - Arricchiscono l'avviso di attraversamento: *«Usa le strisce pedonali»*, *«Aspetta il verde»*.
4. **Incroci con svolta**, dalle istruzioni di navigazione: *«Tra poco c'è un incrocio. Gira a destra in Viale San Michele. Attenzione alle auto che svoltano»*.
5. **Traffico in tempo reale** (strato traffico di Google Maps). **Incidenti, cantieri e chiusure** arrivano da TomTom Traffic Incidents v5, perché Google non li fornisce come dati elaborabili. È previsto anche l'inserimento diretto delle ordinanze di viabilità del Comune.
   - Sono mostrati sulla mappa.
   - Se distano meno di 25 m dal percorso diventano punti critici.

Per non lasciare mai l'utente senza protezione, l'app include uno **snapshot di OpenStreetMap del comune**. Se il servizio online non è raggiungibile, gli avvisi funzionano comunque.

## 4. Facilità d'uso per le persone anziane (criterio: 20 punti)

- **Un solo gesto principale**: il grande pulsante «🎤 Dove vuoi andare?». Le destinazioni frequenti (Municipio, Farmacia, Chiesa, Cimitero, Scuola) sono a un tocco.
- **Tutto è anche parlato**: voce italiana rallentata (rate 0,9), con il pulsante «🔊 Ripeti» sempre disponibile.
- Testi di almeno 20 px e pulsanti alti da 64 a 96 px. Alto contrasto: blu/bianco, giallo/nero per l'attenzione, rosso/bianco per lo stop.
- **Avvisi multisensoriali**: testo, voce, vibrazione e notifica di sistema. Si notano anche con il telefono in tasca o con l'udito ridotto.
- Il simulatore di cammino si **ferma sul FERMATI finché l'utente non preme «Ho capito»**, come una persona che si ferma sul bordo del marciapiede.
- Niente account, password, registrazione o pubblicità.
- Ripiego per chi non vuole o non può parlare: un campo di testo.

## 5. Efficacia attesa e metodo di misura (criterio: 30 punti)

Nel 2025 le vittime anziane negli attraversamenti del centro storico sono state 342. La soluzione agisce sui tre fattori principali di rischio dell'investimento pedonale:
1. attraversare senza fermarsi;
2. non vedere il pericolo (scarsa attenzione o visibilità);
3. scegliere percorsi o punti di attraversamento pericolosi.

**Indicatori misurati dall'app** (sul dispositivo, nella sezione «I miei numeri»):

| Indicatore | Significato |
|---|---|
| Attraversamenti guidati | Punti critici superati dopo un avviso preventivo |
| Avvisi emessi | Situazioni di rischio segnalate in anticipo |
| «Fermati» emessi | Momenti in cui l'utente è stato fatto fermare prima di attraversare |
| Pericoli segnalati sul percorso | Cantieri, incidenti e chiusure evitati o affrontati con preavviso |
| Km a piedi, arrivi a destinazione | Esposizione al rischio e uso effettivo |

**Metodo di valutazione proposto al Comune** (prima/dopo, con gruppo di controllo):
1. **Linea di base**: i dati 2025 di Polizia Locale e Pronto Soccorso su decessi e incidenti con pedoni over 65 nel centro storico, divisi per via e incrocio.
2. **Adozione**: numero di installazioni e di viaggi. Con il consenso dell'utente si raccolgono solo **totali anonimi aggregati**, mai posizioni o percorsi.
3. **Esito**: confronto trimestrale di decessi e incidenti nei punti critici coperti dall'app, rispetto alla linea di base e alle zone o fasce d'età non coperte.
4. **Vite salvate stimate** = riduzione degli eventi nei punti coperti × tasso di letalità storico. Viene riportata in un cruscotto trimestrale per l'Amministrazione.

## 6. Originalità (criterio: 15 punti)

- **Voce in ingresso e in uscita**: si parla per scegliere la meta e si viene guidati a voce. Non serve guardare lo schermo mentre si cammina.
- **Avvisi proattivi a due livelli** (attenzione a 40 m, FERMATI a 15 m) legati all'**attraversamento reale** della carreggiata, non alla semplice vicinanza a un punto.
- I dati di traffico in tempo reale (cantieri, incidenti, code) sono usati per **la sicurezza del pedone**, non per l'automobilista.
- **Zero infrastruttura in strada**: niente sensori, beacon o semafori nuovi. I vicoli restano come sono.

## 7. Fattibilità e tempi (criterio: 10 punti)

- **Architettura senza server e senza database**: React con Vite, distribuita come PWA statica.
  - Mappa, ricerca e percorso: Google Maps Platform (Maps JavaScript API con strato traffico, Places API, Routes API).
  - Cantieri e incidenti: TomTom Traffic Incidents.
  - Strade principali, strisce e semafori: OpenStreetMap (Overpass).
  - **Riserva automatica**: se Google non risponde (chiave, rete, quote), l'app passa a OpenStreetMap (Leaflet, Nominatim, OSRM) senza interrompere la guida.
- **Messa in funzione entro 90 minuti dalla firma** (Art. 3):

  | Tempo | Attività |
  |---|---|
  | 0–20 min | Pubblicazione dei file statici su un hosting HTTPS |
  | 20–40 min | Configurazione delle chiavi Google/TomTom (limitate al dominio) e dello snapshot OSM del centro storico |
  | 40–70 min | Prova su strada di un percorso campione |
  | 70–90 min | Distribuzione del QR code a farmacie, parrocchie e centri anziani |

- **Gestione e manutenzione per 48 mesi**:
  - aggiornamento trimestrale dello snapshot cartografico;
  - mappatura con il Comune delle strisce e dei semafori mancanti in OSM;
  - adeguamento ai nuovi browser;
  - report trimestrale sugli indicatori.
- Prototipo funzionante già disponibile: è la demo allegata, sul comune pilota di Prevalle (BS).

## 8. Tutela della privacy (criterio: 5 punti)

Progettazione conforme al GDPR (artt. 5 e 25: minimizzazione e *privacy by design*):
- **Nessun account e nessun database.** L'app non raccoglie nome, telefono o email.
- **La posizione resta sul telefono.** Serve solo a calcolare la distanza dai punti critici. Ai servizi di mappa (Google, TomTom) vengono inviati soltanto partenza e destinazione del singolo percorso, senza alcun identificativo dell'utente: nessun account Google è richiesto.
- Google è un fornitore extra-UE. Il trattamento avviene secondo i termini di Google Maps Platform, con clausole contrattuali standard ed EU-US Data Privacy Framework. Per la produzione si valuterà con il DPO del Comune se l'invio di partenza e destinazione richiede una DPIA. In ogni caso è disponibile la riserva interamente europea/open (OpenStreetMap).
- **Le statistiche, i posti salvati (compreso l'indirizzo di casa) e la cronologia sono salvati solo sul dispositivo** (archivio locale del browser). Si possono cancellare in qualsiasi momento, anche un posto alla volta. La cronologia non viene mai inviata al Comune né a terzi.
- Un'eventuale condivisione con il Comune avverrebbe solo su consenso esplicito e solo come **totali anonimi aggregati**.
- Nessuna profilazione, nessuna pubblicità, nessun tracciamento di terze parti.

## 9. Costi infrastrutturali

L'app non richiede server applicativi, database né apparati in strada. I costi infrastrutturali si riducono a:
- hosting di file statici, con costo trascurabile;
- consumo delle API Google Maps Platform: rientra nelle quote mensili gratuite durante il pilota, poi è a consumo in base ai percorsi calcolati;
- TomTom Traffic Incidents: piano gratuito.

Tutta la quota del contratto può quindi andare a diffusione, formazione dei cittadini e gestione nei 48 mesi.

## 10. Limiti del prototipo e passi successivi

- Il riconoscimento vocale richiede Chrome (Android) o Safari recente (iOS). In alternativa c'è il campo di testo.
- La qualità dei punti critici dipende dalla mappatura OSM di strisce e semafori. Nei primi mesi è previsto un censimento con la Polizia Locale.
- In un piccolo comune TomTom può non avere segnalazioni attive. La demo mostra allora alcune segnalazioni dimostrative, indicate come «dati demo».
- Sviluppi possibili:
  - avviso a un familiare all'arrivo, con consenso;
  - modalità notturna e ad alta visibilità;
  - integrazione con i semafori intelligenti, se il Comune ne installerà.
