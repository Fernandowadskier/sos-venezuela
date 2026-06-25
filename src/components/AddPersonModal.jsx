import { useState, useRef } from 'react'
import { supabase, uploadPhoto } from '../lib/supabase'
import { ModalWrapper } from './AddBuildingModal'

export default function AddPersonModal({ buildings, preselectedBuilding, onClose, onSuccess, onBuildingSelected }) {
  const [form, setForm] = useState({
    full_name: '',
    age: '',
    gender: '',
    building_id: preselectedBuilding?.id || '',
    last_seen_date: '',
    last_seen_description: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    status: 'desaparecido',
  })
  const [photos, setPhotos] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const canSubmit = form.full_name.trim() && photoFiles.length > 0

  const handleFiles = (files) => {
    const incoming = Array.from(files)
    const merged = [...photoFiles, ...incoming].slice(0, 5)
    setPhotoFiles(merged)
    setPhotos(merged.map(f => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) {
      setError('El nombre es requerido.')
      return
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
      const { error: dbError } = await supabase.from('missing_persons').insert({
        full_name: form.full_name.trim(),
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        building_id: form.building_id || null,
        last_seen_date: form.last_seen_date || null,
        last_seen_description: form.last_seen_description.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        status: form.status,
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
    <ModalWrapper onClose={onClose} title="Reportar persona desaparecida">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Nombre y apellidos"
            className="input"
            required
          />
        </div>

        {/* Age & Gender */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Edad</label>
            <input
              type="number"
              min="0"
              max="120"
              value={form.age}
              onChange={e => set('age', e.target.value)}
              placeholder="Años"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Género</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className="input">
              <option value="">No especificado</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Foto de la persona <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(mín. 1, máx. 5)</span>
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              photoFiles.length > 0 ? 'border-green-400 bg-green-50' : 'border-red-300 hover:border-orange-400'
            }`}
          >
            {photos.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {photos.map((src, i) => (
                  <img key={i} src={src} alt="" className="h-16 w-16 object-cover rounded-full border-2 border-white shadow" />
                ))}
                <div className="flex items-center justify-center w-16 h-16 border-2 border-dashed border-gray-300 rounded-full text-gray-400 text-xs">
                  +
                </div>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 text-red-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-xs text-red-400 font-medium">Se requiere al menos una foto</p>
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

        {/* Last seen */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha última vez visto/a</label>
          <input
            type="date"
            value={form.last_seen_date}
            onChange={e => set('last_seen_date', e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">¿Dónde fue visto/a por última vez?</label>
          <textarea
            value={form.last_seen_description}
            onChange={e => set('last_seen_description', e.target.value)}
            placeholder="Describe el lugar, hora, ropa que vestía, cualquier detalle útil..."
            rows={3}
            className="input resize-none"
          />
        </div>

        {/* Building association */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Asociar a una edificación afectada
          </label>
          <select
            value={form.building_id}
            onChange={e => {
              set('building_id', e.target.value)
              const building = buildings.find(b => b.id === e.target.value)
              if (building) onBuildingSelected?.(building)
            }}
            className="input"
          >
            <option value="">— No asociar a edificación —</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Opcional: vincula esta persona a un lugar afectado</p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Estado</label>
          <div className="flex gap-2">
            {[
              { value: 'desaparecido', label: 'Desaparecido', color: 'orange' },
              { value: 'encontrado',   label: 'Encontrado',   color: 'green' },
              { value: 'fallecido',    label: 'Fallecido',    color: 'gray' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('status', opt.value)}
                className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                  form.status === opt.value
                    ? opt.color === 'orange' ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : opt.color === 'green'  ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-400 bg-gray-50 text-gray-700'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contacto para información</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre del contacto</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={e => set('contact_name', e.target.value)}
              placeholder="Nombre del familiar o conocido"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={e => set('contact_phone', e.target.value)}
              placeholder="+58 412 000 0000"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email (opcional)</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={e => set('contact_email', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="input"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !canSubmit}
          className={`w-full text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 ${
            canSubmit && !loading ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : 'Reportar persona desaparecida'}
        </button>
      </form>
    </ModalWrapper>
  )
}
