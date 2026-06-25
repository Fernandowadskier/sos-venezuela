import { useState } from 'react'
import PersonDetailModal from './PersonDetailModal'

export default function BuildingPanel({ building, damageLabel, damageColor, onClose, onAddPerson }) {
  const missing = building.missing_persons?.filter(p => p.status === 'desaparecido') || []
  const found = building.missing_persons?.filter(p => p.status === 'encontrado') || []
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const photos = building.photos || []

  return (
    <div className="absolute right-0 top-14 bottom-14 w-80 bg-white shadow-2xl z-20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white mb-2"
              style={{ backgroundColor: damageColor }}
            >
              <span>{damageLabel}</span>
            </div>
            <h2 className="font-bold text-gray-900 text-base leading-tight truncate">{building.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{building.address}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {building.description && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{building.description}</p>
        )}

        {/* Stats */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-orange-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-orange-600">{missing.length}</p>
            <p className="text-xs text-orange-700">Desaparecidos</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-600">{found.length}</p>
            <p className="text-xs text-green-700">Encontrados</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="flex-shrink-0 border-b">
        {photos.length > 0 ? (
          <div className="relative">
            <img
              src={photos[0]}
              alt="Foto principal"
              className="w-full h-44 object-cover cursor-pointer"
              onClick={() => setLightboxIndex(0)}
            />
            {photos.length > 1 && (
              <div className="flex gap-1 p-2">
                {photos.slice(1).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i + 2}`}
                    onClick={() => setLightboxIndex(i + 1)}
                    className="w-16 h-12 object-cover rounded-md flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-44 bg-gray-100 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-gray-400">Sin fotos disponibles</p>
          </div>
        )}
      </div>

      {/* Photo gallery lightbox */}
      {lightboxIndex !== null && (
        <PhotoGallery
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Missing persons list */}
      <div className="flex-1 overflow-y-auto">
        {building.missing_persons && building.missing_persons.length > 0 ? (
          <div>
            {building.missing_persons.map(person => (
              <PersonCard key={person.id} person={person} onClick={() => setSelectedPerson(person)} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm">No hay personas registradas</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t bg-gray-50">
        <button
          onClick={onAddPerson}
          className="w-full flex items-center justify-center gap-2 bg-[#6B1B2E] hover:bg-[#551525] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Reportar persona desaparecida aquí
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Reportado el {new Date(building.created_at).toLocaleDateString('es-VE')}
        </p>
      </div>

      {selectedPerson && (
        <PersonDetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </div>
  )
}

function PhotoGallery({ photos, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const prev = () => setIndex(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIndex(i => (i + 1) % photos.length)

  const handleKey = (e) => {
    if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onKeyDown={handleKey}
      tabIndex={-1}
      ref={el => el?.focus()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white/60 text-sm font-medium">{index + 1} / {photos.length}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main image + arrows */}
      <div className="flex-1 relative flex items-center justify-center px-12 min-h-0">
        <img
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain select-none"
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 justify-center px-4 py-3 overflow-x-auto">
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Miniatura ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`w-14 h-14 object-cover rounded-lg flex-shrink-0 cursor-pointer transition-all ${
                i === index ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonCard({ person, onClick }) {
  const statusConfig = {
    desaparecido: { color: 'bg-orange-100 text-orange-700', label: 'Desaparecido' },
    encontrado:   { color: 'bg-green-100 text-green-700',  label: 'Encontrado' },
    fallecido:    { color: 'bg-gray-100 text-gray-600',    label: 'Fallecido' },
  }
  const status = statusConfig[person.status] || statusConfig.desaparecido

  return (
    <div className="p-3 border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex items-start gap-3">
        {/* Photo or avatar */}
        <div className="flex-shrink-0">
          {person.photos && person.photos[0] ? (
            <img
              src={person.photos[0]}
              alt={person.full_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{person.full_name}</p>
            <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          {person.age && (
            <p className="text-xs text-gray-500 mt-0.5">{person.age} años</p>
          )}
          {person.contact_phone && (
            <a
              href={`tel:${person.contact_phone}`}
              onClick={e => e.stopPropagation()}
              className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {person.contact_name ? `${person.contact_name}: ` : ''}{person.contact_phone}
            </a>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 self-center ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
