import { useEffect } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { CITY } from '../config'
import { flowTileUrl } from '../services/tomtom'
import { HAZARD_EMOJI, PASSED_COLOR, POINT_COLOR } from './mapStyle'

const icon = (html, className, size = 44) =>
  L.divIcon({ html, className, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })

function FitRoute({ route }) {
  const map = useMap()
  useEffect(() => {
    if (!route) return
    const id = setTimeout(() => {
      map.invalidateSize()
      map.fitBounds(L.latLngBounds(route.line), { padding: [40, 40] })
    }, 150)
    return () => clearTimeout(id)
  }, [route, map])
  return null
}

function FocusOn({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (focus) map.setView(focus.pos, 18)
  }, [focus, map])
  return null
}

function Follow({ pos, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (enabled && pos) map.panTo(pos, { animate: true })
  }, [pos, enabled, map])
  return null
}

export default function MapView({ hazards, route, points, me, follow, destination, passedIds, savedPlaces = [], focus }) {
  return (
    <MapContainer center={CITY.center} zoom={CITY.zoom} zoomControl={false} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {flowTileUrl && (
        <TileLayer url={flowTileUrl} opacity={0.75} attribution="Traffico &copy; TomTom" maxZoom={19} />
      )}

      {hazards.map((h) => (
        <Marker key={h.id} position={h.pos} icon={icon(HAZARD_EMOJI[h.kind] || '⚠️', 'hazard-icon', 40)}>
          <Popup>
            <strong>{h.label}</strong>
            <br />
            {h.description}
            <br />
            <small>Fonte: {h.source}</small>
          </Popup>
        </Marker>
      ))}
      {hazards
        .filter((h) => h.line.length > 1)
        .map((h) => (
          <Polyline key={h.id + '-l'} positions={h.line} pathOptions={{ color: '#c8102e', weight: 8, dashArray: '6 8' }} />
        ))}

      {route && (
        <>
          <Polyline positions={route.line} pathOptions={{ color: '#fff', weight: 12, opacity: 0.9 }} />
          <Polyline positions={route.line} pathOptions={{ color: '#0b3d91', weight: 7 }} />
          <FitRoute route={route} />
        </>
      )}

      {points.map((p) => (
        <Marker
          key={p.id}
          position={p.pos}
          icon={icon(
            `<span style="background:${passedIds.has(p.id) ? PASSED_COLOR : POINT_COLOR[p.type]}">${
              passedIds.has(p.id) ? '✓' : p.n
            }</span>`,
            'point-icon',
            38
          )}
        >
          <Popup>
            <strong>
              {p.n}. {p.title}
            </strong>
            <br />
            {p.detail}
          </Popup>
        </Marker>
      ))}

      {savedPlaces.map((p) => (
        <Marker key={p.id} position={p.pos} icon={icon(p.icon, 'saved-icon', 40)}>
          <Popup>
            <strong>
              {p.icon} {p.label}
            </strong>
            <br />
            {p.address}
          </Popup>
        </Marker>
      ))}

      {focus && (
        <>
          <Marker position={focus.pos} icon={icon(focus.icon, 'focus-icon', 56)} zIndexOffset={2000} />
          <FocusOn focus={focus} />
        </>
      )}

      {destination && <Marker position={destination.pos} icon={icon('🏁', 'hazard-icon', 44)} />}

      {me && (
        <>
          <Circle center={me} radius={40} pathOptions={{ color: '#0b3d91', weight: 1, fillOpacity: 0.08 }} />
          <Marker position={me} icon={icon('<span></span>', 'me-icon', 28)} zIndexOffset={1000} />
          <Follow pos={me} enabled={follow} />
        </>
      )}
    </MapContainer>
  )
}
