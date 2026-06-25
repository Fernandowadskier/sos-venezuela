import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import PersonDetailModal from './PersonDetailModal'

const PAGE_SIZE = 20

const DAMAGE_LABELS = {
  collapse:   'Derrumbe',
  structural: 'Daño estructural',
  fire:       'Incendio',
  flood:      'Inundación',
  landslide:  'Deslizamiento',
  other:      'Otro',
}

const DAMAGE_COLORS = {
  structural: '#f59e0b',
  collapse:   '#ef4444',
  fire:       '#f97316',
  flood:      '#3b82f6',
  landslide:  '#8b5cf6',
  other:      '#6b7280',
}

const STATUS_CONFIG = {
  desaparecido: { label: 'Desaparecido', bg: 'bg-orange-100 text-orange-700', activeBg: 'bg-orange-500 text-white' },
  encontrado:   { label: 'Encontrado',   bg: 'bg-green-100 text-green-700',   activeBg: 'bg-green-500 text-white' },
  fallecido:    { label: 'Fallecido',    bg: 'bg-gray-100 text-gray-600',     activeBg: 'bg-gray-500 text-white' },
}

export default function SearchPage({ onSelectBuilding }) {
  const [tab, setTab] = useState('buildings')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [damageFilter, setDamageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [buildingFilter, setBuildingFilter] = useState(null) // { id, name }
  const [buildings, setBuildings] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef(null)

  // Load building list for persons filter dropdown
  useEffect(() => {
    if (tab !== 'persons') return
    supabase.from('buildings').select('id, name').order('name').then(({ data }) => {
      setBuildings(data || [])
    })
  }, [tab])

  // Debounce search input
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  // Reset + fetch when tab/search/filters change
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setResults([])
      setOffset(0)
      setHasMore(false)
      const { data, count } = await fetchPage(tab, search, damageFilter, statusFilter, buildingFilter?.id || null, 0)
      if (cancelled) return
      setResults(data || [])
      setOffset(PAGE_SIZE)
      setHasMore(PAGE_SIZE < (count || 0))
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [tab, search, damageFilter, statusFilter, buildingFilter])

  const loadMore = async () => {
    setLoading(true)
    const { data, count } = await fetchPage(tab, search, damageFilter, statusFilter, buildingFilter?.id || null, offset)
    setResults(r => [...r, ...(data || [])])
    setOffset(o => o + PAGE_SIZE)
    setHasMore(offset + PAGE_SIZE < (count || 0))
    setLoading(false)
  }

  const switchTab = (t) => {
    setTab(t)
    setSearchInput('')
    setSearch('')
    setDamageFilter('')
    setStatusFilter('')
    setBuildingFilter(null)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Sub-tabs */}
      <div className="flex bg-white border-b flex-shrink-0">
        <button
          onClick={() => switchTab('buildings')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            tab === 'buildings' ? 'text-red-600 border-red-600' : 'text-gray-400 border-transparent'
          }`}
        >
          Edificaciones
        </button>
        <button
          onClick={() => switchTab('persons')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
            tab === 'persons' ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
          }`}
        >
          Personas
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 bg-white border-b flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={tab === 'buildings' ? 'Buscar por nombre o dirección...' : 'Buscar por nombre...'}
            className="w-full pl-9 pr-8 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-red-400 transition-all"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b flex-shrink-0">
        {/* Status / damage chips */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
          {tab === 'buildings'
            ? Object.entries(DAMAGE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDamageFilter(f => f === key ? '' : key)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={
                    damageFilter === key
                      ? { backgroundColor: DAMAGE_COLORS[key], color: '#fff', borderColor: 'transparent' }
                      : { backgroundColor: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }
                  }
                >
                  {label}
                </button>
              ))
            : Object.entries(STATUS_CONFIG).map(([key, { label, bg, activeBg }]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(f => f === key ? '' : key)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border border-transparent transition-all ${
                    statusFilter === key ? activeBg : bg
                  }`}
                >
                  {label}
                </button>
              ))
          }
        </div>

        {/* Building dropdown — persons tab only */}
        {tab === 'persons' && (
          <div className="px-4 pb-2">
            <BuildingDropdown
              buildings={buildings}
              value={buildingFilter}
              onChange={setBuildingFilter}
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">No se encontraron resultados</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
              {tab === 'buildings'
                ? results.map(b => <BuildingCard key={b.id} building={b} onSelect={onSelectBuilding} />)
                : results.map(p => <PersonCard key={p.id} person={p} onSelect={setSelectedPerson} />)
              }
            </div>
            <LoadMore hasMore={hasMore} loading={loading} onLoad={loadMore} />
          </div>
        )}
      </div>

      {selectedPerson && (
        <PersonDetailModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </div>
  )
}

// ── Searchable building dropdown ──────────────────────────────────────────────

function BuildingDropdown({ buildings, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  const filtered = query.trim()
    ? buildings.filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    : buildings

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (building) => {
    onChange(building)
    setOpen(false)
    setQuery('')
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
          value ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-200 bg-gray-50 text-gray-500'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="truncate">{value ? value.name : 'Todas las edificaciones'}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span onClick={clear} className="text-orange-400 hover:text-orange-600 p-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 flex flex-col">
          <div className="p-2 border-b flex-shrink-0">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar edificación..."
              className="w-full px-3 py-1.5 bg-gray-100 rounded-lg text-sm outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!value ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}
            >
              Todas las edificaciones
            </button>
            {filtered.map(b => (
              <button
                key={b.id}
                onClick={() => select(b)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors truncate ${
                  value?.id === b.id ? 'text-orange-600 font-semibold bg-orange-50' : 'text-gray-700'
                }`}
              >
                {b.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Load more button ──────────────────────────────────────────────────────────

function LoadMore({ hasMore, loading, onLoad }) {
  if (!hasMore) return null
  return (
    <div className="p-4">
      <button
        onClick={onLoad}
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Cargando...' : 'Cargar más'}
      </button>
    </div>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPage(tab, search, damageFilter, statusFilter, buildingId, fromOffset) {
  if (tab === 'buildings') {
    let q = supabase
      .from('buildings')
      .select('id, name, address, damage_type, lat, lng, photos, missing_persons(id, status)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(fromOffset, fromOffset + PAGE_SIZE - 1)
    if (search) q = q.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
    if (damageFilter) q = q.eq('damage_type', damageFilter)
    return q
  } else {
    let q = supabase
      .from('missing_persons')
      .select('id, full_name, age, status, photos, last_seen_date, contact_phone, buildings(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(fromOffset, fromOffset + PAGE_SIZE - 1)
    if (search) q = q.ilike('full_name', `%${search}%`)
    if (statusFilter) q = q.eq('status', statusFilter)
    if (buildingId) q = q.eq('building_id', buildingId)
    return q
  }
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function BuildingCard({ building, onSelect }) {
  const missingCount = building.missing_persons?.filter(p => p.status === 'desaparecido').length || 0
  const color = DAMAGE_COLORS[building.damage_type] || DAMAGE_COLORS.other
  const label = DAMAGE_LABELS[building.damage_type] || 'Otro'

  return (
    <button
      onClick={() => onSelect(building)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col text-left active:scale-95 transition-transform"
    >
      {/* Photo / placeholder */}
      <div className="relative aspect-square w-full" style={{ backgroundColor: color }}>
        {building.photos?.[0] ? (
          <img src={building.photos[0]} alt={building.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-60">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
        )}
        <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: color }}>
          {label}
        </span>
        {missingCount > 0 && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-500 text-white">
            {missingCount}
          </span>
        )}
      </div>

      {/* Data */}
      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{building.name}</p>
        <p className="text-xs text-gray-500 truncate">{building.address}</p>
      </div>
    </button>
  )
}

function PersonCard({ person, onSelect }) {
  const status = STATUS_CONFIG[person.status] || STATUS_CONFIG.desaparecido

  return (
    <button
      onClick={() => onSelect(person)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col text-left active:scale-95 transition-transform w-full">
      {/* Photo */}
      <div className="relative aspect-square w-full bg-gray-100">
        {person.photos?.[0] ? (
          <img src={person.photos[0]} alt={person.full_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold ${status.bg}`}>
          {status.label}
        </span>
      </div>

      {/* Data */}
      <div className="p-2.5 flex flex-col gap-0.5 flex-1">
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{person.full_name}</p>
        {person.age && <p className="text-xs text-gray-500">{person.age} años</p>}
        {person.last_seen_date && (
          <p className="text-xs text-gray-400">{new Date(person.last_seen_date).toLocaleDateString('es-VE')}</p>
        )}
        {person.buildings && (
          <p className="text-xs text-blue-600 truncate mt-0.5">{person.buildings.name}</p>
        )}
        {person.contact_phone && (
          <a
            href={`tel:${person.contact_phone}`}
            onClick={e => e.stopPropagation()}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg px-2 py-1 transition-colors"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Llamar
          </a>
        )}
      </div>
    </button>
  )
}
