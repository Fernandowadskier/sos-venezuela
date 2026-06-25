import { useState } from 'react'
import { ModalWrapper } from './AddBuildingModal'

const STATUS_CONFIG = {
  desaparecido: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Desaparecido' },
  encontrado:   { color: 'bg-green-100 text-green-700 border-green-200',   label: 'Encontrado' },
  fallecido:    { color: 'bg-gray-100 text-gray-600 border-gray-200',      label: 'Fallecido' },
}

const GENDER_LABEL = { M: 'Masculino', F: 'Femenino', otro: 'Otro' }

export default function PersonDetailModal({ person, onClose }) {
  const [lightbox, setLightbox] = useState(null)
  const status = STATUS_CONFIG[person.status] || STATUS_CONFIG.desaparecido

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('es-VE', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <>
      <ModalWrapper onClose={onClose} title="Ficha de persona">
        <div className="space-y-5 pb-2">

          {/* Status badge + name */}
          <div className="flex flex-col items-center text-center gap-3 pt-1">
            {person.photos && person.photos.length > 0 ? (
              <img
                src={person.photos[0]}
                alt={person.full_name}
                onClick={() => setLightbox(person.photos[0])}
                className="w-full h-52 object-cover rounded-xl shadow-lg cursor-pointer"
              />
            ) : (
              <div className="w-full h-52 rounded-xl bg-gray-100 shadow-lg flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900">{person.full_name}</h3>
              <span className={`inline-block mt-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Basic info */}
          <Section title="Información personal">
            <Row label="Edad" value={person.age ? `${person.age} años` : null} />
            <Row label="Género" value={person.gender ? GENDER_LABEL[person.gender] : null} />
            <Row
              label="Última vez visto/a"
              value={formatDate(person.last_seen_date)}
            />
            {person.last_seen_description && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                  {person.last_seen_description}
                </p>
              </div>
            )}
          </Section>

          {/* Additional photos */}
          {person.photos && person.photos.length > 1 && (
            <Section title="Fotos adicionales">
              <div className="flex gap-2 flex-wrap">
                {person.photos.slice(1).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i + 2}`}
                    onClick={() => setLightbox(url)}
                    className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Contact info */}
          {(person.contact_name || person.contact_phone || person.contact_email) && (
            <Section title="Contacto para información">
              <Row label="Nombre" value={person.contact_name} />
              {person.contact_phone && (
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500 font-medium">Teléfono</span>
                  <a
                    href={`tel:${person.contact_phone}`}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {person.contact_phone}
                  </a>
                </div>
              )}
              {person.contact_email && (
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500 font-medium">Email</span>
                  <a
                    href={`mailto:${person.contact_email}`}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 truncate ml-2"
                  >
                    {person.contact_email}
                  </a>
                </div>
              )}
            </Section>
          )}

          {/* Footer meta */}
          <p className="text-xs text-gray-400 text-center">
            Reportado el {formatDate(person.created_at)}
          </p>
        </div>
      </ModalWrapper>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white opacity-70 hover:opacity-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  )
}
