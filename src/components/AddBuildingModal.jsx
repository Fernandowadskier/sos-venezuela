import { useState, useRef, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import { supabase, uploadPhoto } from '../lib/supabase'

const DAMAGE_OPTIONS = [
  { value: 'collapse',   label: 'Derrumbe',          emoji: '🏚️' },
  { value: 'structural', label: 'Daño estructural',   emoji: '⚠️' },
  { value: 'fire',       label: 'Incendio',           emoji: '🔥' },
  { value: 'flood',      label: 'Inundación',         emoji: '💧' },
  { value: 'landslide',  label: 'Deslizamiento',      emoji: '⛰️' },
  { value: 'other',      label: 'Otro',               emoji: '📍' },
]

export default function AddBuildingModal({ onClose, onSuccess, pickedCoords, onPickLocation, onLocationFound, hidden }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    lat: pickedCoords?.lat || '',
    lng: pickedCoords?.lng || '',
    damage_type: '',
    description: '',
  })
  const [photos, setPhotos] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [nearbyBuilding, setNearbyBuilding] = useState(null)
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const fileRef = useRef()

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  useEffect(() => {
    if (!pickedCoords) return
    setForm(f => ({ ...f, lat: pickedCoords.lat, lng: pickedCoords.lng }))
    setResolvedAddress('Buscando ubicación...')
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${pickedCoords.lat}&lon=${pickedCoords.lng}&format=json`,
      { headers: { 'User-Agent': 'CrisisVenezuelaApp/1.0', 'Accept-Language': 'es' } }
    )
      .then(r => r.json())
      .then(data => {
        const a = data.address || {}
        const parts = [a.road, a.suburb, a.city || a.town || a.municipality, a.state].filter(Boolean)
        const label = parts.length > 0 ? parts.join(', ') : data.display_name
        setResolvedAddress(label)
        setForm(f => ({ ...f, address: f.address || label }))
      })
      .catch(() => {
        const fallback = `${pickedCoords.lat}, ${pickedCoords.lng}`
        setResolvedAddress(fallback)
        setForm(f => ({ ...f, address: f.address || fallback }))
      })
  }, [pickedCoords])

  const geocodeAddress = async () => {
    if (!form.address.trim()) return
    setGeoLoading(true)
    setError('')
    try {
      const query = encodeURIComponent(form.address + ', Venezuela')
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ve`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'CrisisVenezuelaApp/1.0' } }
      )
      const data = await res.json()
      if (data && data.length > 0) {
        const { lat, lon, address = {}, display_name } = data[0]
        const parts = [address.road, address.suburb, address.city || address.town || address.municipality, address.state].filter(Boolean)
        const label = parts.length > 0 ? parts.join(', ') : display_name
        setForm(f => ({ ...f, lat: parseFloat(lat).toFixed(6), lng: parseFloat(lon).toFixed(6), address: f.address || label }))
        setResolvedAddress(label)
        onLocationFound?.(parseFloat(lat), parseFloat(lon))
      } else {
        setError('No se encontró la dirección. Intenta con más detalle o selecciona en el mapa.')
      }
    } catch {
      setError('Error al buscar. Intenta de nuevo o selecciona en el mapa.')
    }
    setGeoLoading(false)
  }

  const coordsInVenezuela = form.lat && form.lng &&
    parseFloat(form.lat) >= 0.6 && parseFloat(form.lat) <= 12.2 &&
    parseFloat(form.lng) >= -73.4 && parseFloat(form.lng) <= -59.6

  const canSubmit = form.name.trim() && form.address.trim() && coordsInVenezuela && form.damage_type && photoFiles.length > 0

  const handleFiles = (files) => {
    const incoming = Array.from(files)
    const merged = [...photoFiles, ...incoming].slice(0, 5)
    setPhotoFiles(merged)
    setPhotos(merged.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.address || !form.lat || !form.lng || !form.damage_type) {
      setError('Completa todos los campos requeridos.')
      return
    }

    // Proximity check — skip if user already confirmed
    if (!confirmDuplicate) {
      const lat = parseFloat(form.lat)
      const lng = parseFloat(form.lng)
      const delta = 0.0005 // ~55 meters bounding box
      const { data: nearby } = await supabase
        .from('buildings')
        .select('id, name')
        .gte('lat', lat - delta).lte('lat', lat + delta)
        .gte('lng', lng - delta).lte('lng', lng + delta)
        .limit(1)
      if (nearby && nearby.length > 0) {
        setNearbyBuilding(nearby[0])
        return
      }
    }

    setLoading(true)
    try {
      const photoUrls = []
      for (const file of photoFiles) {
        try {
          const url = await uploadPhoto(file)
          photoUrls.push(url)
        } catch {
          // skip photos that fail to upload rather than blocking the report
        }
      }
      const { error: dbError } = await supabase.from('buildings').insert({
        name: form.name.trim(),
        address: form.address.trim(),
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        damage_type: form.damage_type,
        description: form.description.trim() || null,
        photos: photoUrls.length > 0 ? photoUrls : null,
      })
      if (dbError) throw dbError
      onSuccess()
    } catch (err) {
      setError(err.message || 'Error al guardar. Intenta de nuevo.')
    }
    setLoading(false)
  }

  return (
    <ModalWrapper onClose={onClose} title="Reportar edificación afectada" hidden={hidden}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Nombre del lugar <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ej: Edificio Las Mercedes, Casa Familia Rodríguez"
            className="input"
          />
        </div>

        {/* Damage type */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Tipo de afectación <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DAMAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('damage_type', opt.value)}
                className={`flex flex-col items-center p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                  form.damage_type === opt.value
                    ? 'border-[#003893] bg-blue-50 text-[#003893]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Address + Geocode */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Dirección exacta <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Calle, número, sector, municipio, estado"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={onPickLocation}
              title="Seleccionar en el mapa"
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={geoLoading || !form.address}
              className="flex-shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {geoLoading ? '...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Map preview + resolved address */}
        {form.lat && form.lng && (
          <div>
            <div className="rounded-xl overflow-hidden h-52 border border-gray-200 mb-2">
              <Map
                longitude={parseFloat(form.lng)}
                latitude={parseFloat(form.lat)}
                zoom={15}
                interactive={false}
                mapStyle="https://tiles.openfreemap.org/styles/liberty"
                style={{ width: '100%', height: '100%' }}
              >
                <Marker longitude={parseFloat(form.lng)} latitude={parseFloat(form.lat)} anchor="bottom">
                  <div className="w-5 h-5 bg-[#003893] rounded-full border-3 border-white shadow-lg" />
                </Marker>
              </Map>
            </div>
            {!coordsInVenezuela && form.lat && form.lng ? (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <div>
                  <p className="text-xs text-red-700 font-semibold">Ubicación fuera de Venezuela</p>
                  <p className="text-xs text-red-600 mt-0.5">Verifica la dirección o usa el pin para seleccionar en el mapa.</p>
                </div>
              </div>
            ) : resolvedAddress ? (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-xs text-green-800 leading-relaxed">{resolvedAddress}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Latitud <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={e => set('lat', e.target.value)}
              placeholder="10.4806"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Longitud <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={e => set('lng', e.target.value)}
              placeholder="-66.9036"
              className="input"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Descripción adicional
          </label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe el estado del lugar, nivel de daño, cuántas personas afectadas..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Fotos <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(mín. 1, máx. 5)</span>
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              photoFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-[#003893]/40 hover:border-[#003893]'
            }`}
          >
            {photos.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {photos.map((src, i) => (
                  <img key={i} src={src} alt="" className="h-16 w-20 object-cover rounded" />
                ))}
                <div className="flex items-center justify-center w-20 h-16 border-2 border-dashed border-gray-300 rounded text-gray-400 text-xs">
                  + agregar
                </div>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 text-[#003893]/40 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-[#003893]/60 font-medium">Se requiere al menos una foto</p>
                <p className="text-xs text-gray-400 mt-0.5">Toca para agregar</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Duplicate warning */}
        {nearbyBuilding && !confirmDuplicate && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3">
            <p className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Edificación cercana detectada</p>
            <p className="text-xs text-yellow-700 mb-3">
              Ya existe "<strong>{nearbyBuilding.name}</strong>" a menos de 50 metros. ¿Es una edificación diferente?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNearbyBuilding(null)}
                className="flex-1 py-1.5 text-xs font-semibold border border-yellow-400 text-yellow-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDuplicate(true); setNearbyBuilding(null) }}
                className="flex-1 py-1.5 text-xs font-semibold bg-yellow-500 text-white rounded-lg"
              >
                Sí, es diferente
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={`w-full text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
            canSubmit && !loading ? 'bg-[#003893] hover:bg-[#002d75]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : 'Reportar edificación'}
        </button>
      </form>
    </ModalWrapper>
  )
}

export function ModalWrapper({ onClose, title, children, hidden }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center ${hidden ? 'hidden' : ''}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <style>{`.input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; transition: border-color 0.15s; } .input:focus { border-color: #003893; box-shadow: 0 0 0 3px rgba(0,56,147,0.12); }`}</style>
          {children}
        </div>
      </div>
    </div>
  )
}
