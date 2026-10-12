import { useEffect, useState } from 'react'
import { AdvancedMarker, AdvancedMarkerAnchorPoint, APIProvider, Circle, InfoWindow, Map, Polyline, useMap } from '@vis.gl/react-google-maps'
import { GOOGLE_KEY, GOOGLE_MAP_ID, MAP_ZOOM } from '../config'
import { HAZARD_EMOJI, PASSED_COLOR, POINT_COLOR } from './mapStyle'

const ll = ([lat, lng]) => ({ lat, lng })
const CENTER = AdvancedMarkerAnchorPoint.CENTER

// Strato traffico di Google (colori su strade scorrevoli / rallentate / ferme)
function TrafficLayer() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const layer = new window.google.maps.TrafficLayer()
    layer.setMap(map)
    return () => layer.setMap(null)
  }, [map])
  return null
}

function FitRoute({ route }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !route) return
    const b = new window.google.maps.LatLngBounds()
    route.line.forEach((p) => b.extend(ll(p)))
    // il pannello sotto la mappa cambia altezza quando arriva il percorso: aspetto il nuovo layout
    const id = setTimeout(() => map.fitBounds(b, 40), 150)
    return () => clearTimeout(id)
  }, [map, route])
  return null
}

// Cambio di paese: sposto la mappa sul nuovo centro
function Recenter({ center }) {
  const map = useMap()
  const key = center.join(',')
  useEffect(() => {
    if (!map) return
    map.panTo(ll(center))
    map.setZoom(MAP_ZOOM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

// Centra la mappa sul posto da confermare
function FocusOn({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !focus) return
    map.panTo(ll(focus.pos))
    map.setZoom(18)
  }, [map, focus])
  return null
}

function Follow({ pos, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (map && enabled && pos) map.panTo(ll(pos))
  }, [map, pos, enabled])
  return null
}

const dashed = [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: '#c8102e', scale: 4 }, offset: '0', repeat: '14px' }]

export default function GoogleMapView({
  center,
  hazards,
  route,
  points,
  me,
  follow,
  destination,
  passedIds,
  savedPlaces = [],
  focus,
  onAuthError,
}) {
  const [info, setInfo] = useState(null)

  // Chiave non valida o API non abilitate: Google chiama questa funzione globale
  useEffect(() => {
    window.gm_authFailure = onAuthError
    return () => {
      delete window.gm_authFailure
    }
  }, [onAuthError])

  return (
    <APIProvider apiKey={GOOGLE_KEY} language="it" region="IT" onError={onAuthError}>
      <Map
        className="map"
        mapId={GOOGLE_MAP_ID}
        defaultCenter={ll(center)}
        defaultZoom={MAP_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        onClick={() => setInfo(null)}
      >
        <TrafficLayer />
        <Recenter center={center} />

        {hazards
          .filter((h) => h.line.length > 1)
          .map((h) => (
            <Polyline key={h.id + '-l'} path={h.line.map(ll)} strokeOpacity={0} icons={dashed} />
          ))}
        {hazards.map((h) => (
          <AdvancedMarker key={h.id} position={ll(h.pos)} anchorPoint={CENTER} onClick={() => setInfo(h)}>
            <div className="hazard-icon">{HAZARD_EMOJI[h.kind] || '⚠️'}</div>
          </AdvancedMarker>
        ))}

        {route && (
          <>
            <Polyline path={route.line.map(ll)} strokeColor="#fff" strokeWeight={12} strokeOpacity={0.9} />
            <Polyline path={route.line.map(ll)} strokeColor="#0b3d91" strokeWeight={7} strokeOpacity={1} />
            <FitRoute route={route} />
          </>
        )}

        {points.map((p) => {
          const passed = passedIds.has(p.id)
          return (
            <AdvancedMarker key={p.id} position={ll(p.pos)} anchorPoint={CENTER} onClick={() => setInfo(p)}>
              <div className="point-icon">
                <span style={{ background: passed ? PASSED_COLOR : POINT_COLOR[p.type] }}>{passed ? '✓' : p.n}</span>
              </div>
            </AdvancedMarker>
          )
        })}

        {savedPlaces.map((p) => (
          <AdvancedMarker key={p.id} position={ll(p.pos)} anchorPoint={CENTER} onClick={() => setInfo({ ...p, detail: p.address })}>
            <div className="saved-icon">{p.icon}</div>
          </AdvancedMarker>
        ))}

        {focus && (
          <>
            <AdvancedMarker position={ll(focus.pos)} anchorPoint={CENTER} zIndex={2000}>
              <div className="focus-icon">{focus.icon}</div>
            </AdvancedMarker>
            <FocusOn focus={focus} />
          </>
        )}

        {destination && (
          <AdvancedMarker position={ll(destination.pos)}>
            <div className="hazard-icon">🏁</div>
          </AdvancedMarker>
        )}

        {me && (
          <>
            <Circle center={ll(me)} radius={40} strokeColor="#0b3d91" strokeWeight={1} fillColor="#0b3d91" fillOpacity={0.08} />
            <AdvancedMarker position={ll(me)} anchorPoint={CENTER} zIndex={1000}>
              <div className="me-icon">
                <span />
              </div>
            </AdvancedMarker>
            <Follow pos={me} enabled={follow} />
          </>
        )}

        {info && (
          <InfoWindow position={ll(info.pos)} onCloseClick={() => setInfo(null)} pixelOffset={[0, -20]}>
            <div className="info">
              <strong>{info.n ? `${info.n}. ${info.title}` : `${info.icon && !info.kind ? info.icon + ' ' : ''}${info.label}`}</strong>
              <br />
              {info.detail || info.description}
              {info.source && (
                <>
                  <br />
                  <small>Fonte: {info.source}</small>
                </>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}
