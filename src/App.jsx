import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl } from 'react-map-gl/maplibre'
import { supabase } from './lib/supabase'
import AddBuildingModal from './components/AddBuildingModal'
import AddPersonModal from './components/AddPersonModal'
import BuildingPanel from './components/BuildingPanel'
import 'maplibre-gl/dist/maplibre-gl.css'

const DAMAGE_COLORS = {
  structural: '#f59e0b',
  collapse:   '#ef4444',
  fire:       '#f97316',
  flood:      '#3b82f6',
  landslide:  '#8b5cf6',
  other:      '#6b7280',
}

const DAMAGE_LABELS = {
  structural: 'Daño estructural',
  collapse:   'Derrumbe',
  fire:       'Incendio',
  flood:      'Inundación',
  landslide:  'Deslizamiento',
  other:      'Otro',
}

export default function App() {
  const [buildings, setBuildings] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [addPersonBuilding, setAddPersonBuilding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pickingLocation, setPickingLocation] = useState(false)
  const [pickedCoords, setPickedCoords] = useState(null)
  const [viewport, setViewport] = useState({
    longitude: -66.9,
    latitude: 10.48,
    zoom: 7,
  })

  useEffect(() => {
    if (pickedCoords && !pickingLocation) {
      setShowAddBuilding(true)
    }
  }, [pickedCoords, pickingLocation])

  const fetchBuildings = useCallback(async () => {
    const { data, error } = await supabase
      .from('buildings')
      .select('*, missing_persons(id, full_name, status, photos)')
      .order('created_at', { ascending: false })
    if (!error) setBuildings(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBuildings()
    // Real-time updates
    const channel = supabase
      .channel('crisis-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buildings' }, fetchBuildings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missing_persons' }, fetchBuildings)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchBuildings])

  const handleBuildingAdded = () => {
    fetchBuildings()
    setShowAddBuilding(false)
    setPickedCoords(null)
  }

  const handlePersonAdded = () => {
    fetchBuildings()
    setShowAddPerson(false)
    setAddPersonBuilding(null)
  }

  const openAddPerson = (building = null) => {
    setAddPersonBuilding(building)
    setShowAddPerson(true)
    setSelectedBuilding(null)
  }

  const missingCount = buildings.reduce((acc, b) => {
    return acc + (b.missing_persons?.filter(p => p.status === 'desaparecido').length || 0)
  }, 0)

  return (
    <div className="relative w-full h-full">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">VE</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm leading-tight">Crisis Venezuela</h1>
              <p className="text-xs text-gray-500">
                {buildings.length} edificaciones · {missingCount} personas desaparecidas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddBuilding(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Edificación
            </button>
            <button
              onClick={() => openAddPerson(null)}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Desaparecido
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tipo de afectación</p>
        {Object.entries(DAMAGE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DAMAGE_COLORS[key] }} />
            <span className="text-xs text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="w-full h-full pt-14">
        <Map
          {...viewport}
          onMove={e => setViewport(e.viewState)}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          style={{ width: '100%', height: '100%', cursor: pickingLocation ? 'crosshair' : 'grab' }}
          onClick={e => {
            if (pickingLocation) {
              const { lng, lat } = e.lngLat
              setPickedCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) })
              setPickingLocation(false)
            } else {
              setSelectedBuilding(null)
            }
          }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />

          {pickedCoords && !pickingLocation && (
            <Marker longitude={parseFloat(pickedCoords.lng)} latitude={parseFloat(pickedCoords.lat)} anchor="bottom">
              <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg" />
            </Marker>
          )}

          {buildings.map(building => (
            <Marker
              key={building.id}
              longitude={building.lng}
              latitude={building.lat}
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation()
                setSelectedBuilding(building)
              }}
            >
              <BuildingPin
                color={DAMAGE_COLORS[building.damage_type] || DAMAGE_COLORS.other}
                count={building.missing_persons?.filter(p => p.status === 'desaparecido').length || 0}
              />
            </Marker>
          ))}
        </Map>
      </div>

      {/* Picking location banner */}
      {pickingLocation && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Toca el mapa para fijar la ubicación
          <button
            onClick={() => { setPickingLocation(false); setShowAddBuilding(true) }}
            className="ml-2 underline text-blue-100 hover:text-white text-xs"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Building detail panel */}
      {selectedBuilding && (
        <BuildingPanel
          building={selectedBuilding}
          damageLabel={DAMAGE_LABELS[selectedBuilding.damage_type]}
          damageColor={DAMAGE_COLORS[selectedBuilding.damage_type]}
          onClose={() => setSelectedBuilding(null)}
          onAddPerson={() => openAddPerson(selectedBuilding)}
        />
      )}

      {/* Modals */}
      {showAddBuilding && (
        <AddBuildingModal
          onClose={() => { setShowAddBuilding(false); setPickedCoords(null) }}
          onSuccess={handleBuildingAdded}
          pickedCoords={pickedCoords}
          onPickLocation={() => { setShowAddBuilding(false); setPickingLocation(true) }}
        />
      )}

      {showAddPerson && (
        <AddPersonModal
          buildings={buildings}
          preselectedBuilding={addPersonBuilding}
          onClose={() => { setShowAddPerson(false); setAddPersonBuilding(null) }}
          onSuccess={handlePersonAdded}
        />
      )}

      {loading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BuildingPin({ color, count }) {
  return (
    <div className="relative cursor-pointer group">
      <div
        className="w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
      >
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      </div>
      {count > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">{count > 9 ? '9+' : count}</span>
        </div>
      )}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${color}`,
        }}
      />
    </div>
  )
}
