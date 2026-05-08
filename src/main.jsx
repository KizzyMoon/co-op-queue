import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Check,
  ChevronDown,
  Clapperboard,
  Edit3,
  Film,
  Gamepad2,
  LogOut,
  MonitorPlay,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  addQueueItem,
  deleteQueueItem,
  listenToQueueItems,
  updateQueueItem,
  updateQueueRanks,
} from './services/queueService'
import { auth, firebaseReady, signInWithGoogle, signOutUser } from './services/firebase'
import './styles.css'

const CATEGORIES = [
  { id: 'current-games', label: 'Current Games', matches: (item) => item.type === 'game' && item.status === 'playing' },
  { id: 'want-next', label: 'Want to Play Next', matches: (item) => item.type === 'game' && item.status === 'planned' },
  { id: 'currently-watching', label: 'Currently Watching', matches: (item) => item.type === 'tv' && item.status === 'watching' },
  { id: 'tv', label: 'TV Shows', matches: (item) => item.type === 'tv' },
  { id: 'movies', label: 'Movies', matches: (item) => item.type === 'movie' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'game', label: 'Games' },
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Movies' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'playing', label: 'Playing' },
  { value: 'watching', label: 'Watching' },
  { value: 'planned', label: 'Planned' },
  { value: 'finished', label: 'Finished' },
  { value: 'dropped', label: 'Dropped' },
]

const EMPTY_FORM = {
  title: '',
  type: 'game',
  status: 'planned',
  rank: 1,
  platform: '',
  notes: '',
}

function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortMode, setSortMode] = useState('updated')
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [draggedItemId, setDraggedItemId] = useState(null)

  useEffect(() => {
    if (!firebaseReady) {
      setAuthReady(true)
      setLoadingItems(false)
      return undefined
    }

    const unsubscribe = auth.onAuthStateChanged((nextUser) => {
      setUser(nextUser)
      setAuthReady(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!firebaseReady || !user) {
      setItems([])
      setLoadingItems(false)
      return undefined
    }

    setLoadingItems(true)
    return listenToQueueItems(
      (nextItems) => {
        setItems(nextItems)
        setLoadingItems(false)
      },
      () => setLoadingItems(false),
    )
  }, [user])

  const filteredItems = useMemo(() => {
    const category = CATEGORIES.find((tab) => tab.id === activeCategory)
    const normalizedQuery = query.trim().toLowerCase()

    return items
      .filter((item) => category?.matches(item))
      .filter((item) => typeFilter === 'all' || item.type === typeFilter)
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .filter((item) => {
        if (!normalizedQuery) return true
        return [item.title, item.platform, item.notes]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => {
        if (sortMode === 'rank') {
          return getRank(a) - getRank(b)
        }
        return getTime(b.lastUpdated) - getTime(a.lastUpdated)
      })
  }, [activeCategory, items, query, sortMode, statusFilter, typeFilter])

  const saveItem = async (formValues) => {
    if (!user) return

    if (editingItem) {
      await updateQueueItem(editingItem.id, formValues)
    } else {
      await addQueueItem({
        ...formValues,
        addedBy: 'Co-op member',
      })
    }

    setEditingItem(null)
    setFormOpen(false)
  }

  const beginEdit = (item) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const closeForm = () => {
    setEditingItem(null)
    setFormOpen(false)
  }

  const reorderItems = async (targetItemId) => {
    if (!draggedItemId || draggedItemId === targetItemId) return

    const fromIndex = filteredItems.findIndex((item) => item.id === draggedItemId)
    const toIndex = filteredItems.findIndex((item) => item.id === targetItemId)
    if (fromIndex < 0 || toIndex < 0) return

    const nextItems = [...filteredItems]
    const [movedItem] = nextItems.splice(fromIndex, 1)
    nextItems.splice(toIndex, 0, movedItem)
    setSortMode('rank')
    setDraggedItemId(null)
    await updateQueueRanks(nextItems)
  }

  if (!authReady) {
    return <Splash message="Warming up the queue..." />
  }

  if (!firebaseReady) {
    return <SetupScreen />
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Shared watchlist and play queue</p>
          <h1>Co-Op Queue</h1>
          <p className="hero-copy">One cozy place for games, shows, and movie nights.</p>
        </div>
        <div className="profile-pill">
          <span>Signed in</span>
          <button className="icon-button" onClick={signOutUser} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="stat-grid" aria-label="Queue summary">
        <StatCard label="Total items" value={items.length} icon={<MonitorPlay size={18} />} />
      </section>

      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the queue" />
        </label>
        <button className="add-button" onClick={() => setFormOpen(true)}>
          <Plus size={18} />
          Add
        </button>
      </section>

      <section className="tabs" aria-label="Queue categories">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={activeCategory === category.id ? 'active' : ''}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </section>

      <section className="filters" aria-label="Queue filters">
        <SelectControl label="Type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
        <SelectControl label="Status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <SelectControl
          label="Sort"
          value={sortMode}
          onChange={setSortMode}
          options={[
            { value: 'updated', label: 'Recently updated' },
            { value: 'rank', label: 'Rank order' },
          ]}
        />
      </section>

      <section className="queue-grid" aria-live="polite">
        {loadingItems ? (
          <EmptyState title="Loading queue..." />
        ) : filteredItems.length ? (
          filteredItems.map((item) => (
            <QueueCard
              key={item.id}
              item={item}
              isDragging={draggedItemId === item.id}
              onEdit={() => beginEdit(item)}
              onDelete={() => deleteQueueItem(item.id)}
              onDragEnd={() => setDraggedItemId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedItemId(item.id)}
              onDrop={() => reorderItems(item.id)}
              onStatusChange={(status) => updateQueueItem(item.id, { status })}
            />
          ))
        ) : (
          <EmptyState title="Nothing here yet" description="Add something or loosen a filter to see more." />
        )}
      </section>

      {formOpen && <ItemForm item={editingItem} onCancel={closeForm} onSave={saveItem} />}
    </main>
  )
}

function LoginScreen() {
  return (
    <main className="center-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <Gamepad2 size={34} />
        </div>
        <p className="eyebrow">Co-Op Queue</p>
        <h1>Pick the next thing together.</h1>
        <p>Sign in with Google to share a live queue for games, TV shows, and movies.</p>
        <button className="google-button" onClick={signInWithGoogle}>
          <span>G</span>
          Continue with Google
        </button>
      </section>
    </main>
  )
}

function SetupScreen() {
  return (
    <main className="center-screen">
      <section className="login-panel">
        <div className="brand-mark">
          <MonitorPlay size={34} />
        </div>
        <p className="eyebrow">Setup needed</p>
        <h1>Add your Firebase config.</h1>
        <p>Create a local .env file from .env.example, then restart the dev server.</p>
      </section>
    </main>
  )
}

function Splash({ message }) {
  return (
    <main className="center-screen">
      <p className="loading-text">{message}</p>
    </main>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <article className="stat-card">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  )
}

function SelectControl({ label, value, onChange, options }) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
    </label>
  )
}

function QueueCard({ item, isDragging, onDelete, onDragEnd, onDragOver, onDragStart, onDrop, onEdit, onStatusChange }) {
  const Icon = item.type === 'game' ? Gamepad2 : item.type === 'tv' ? Clapperboard : Film

  return (
    <article
      className={`queue-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <div className="card-topline">
        <span className={`type-badge ${item.type}`}>
          <Icon size={15} />
          {item.type}
        </span>
        <span className="rank-badge">#{getRank(item)}</span>
      </div>
      <h2>{item.title}</h2>
      <p className="meta-line">{item.platform || 'No platform set'}</p>
      {item.notes && <p className="notes">{item.notes}</p>}
      <div className="status-row">
        <SelectControl
          label="Status"
          value={item.status}
          onChange={onStatusChange}
          options={STATUS_OPTIONS.filter((status) => status.value !== 'all')}
        />
      </div>
      <footer>
        <div>
          <span>Added by co-op member</span>
          <span>{formatDate(item.lastUpdated)}</span>
        </div>
        <div className="card-actions">
          <button className="icon-button" onClick={onEdit} aria-label={`Edit ${item.title}`}>
            <Edit3 size={17} />
          </button>
          <button className="icon-button danger" onClick={onDelete} aria-label={`Delete ${item.title}`}>
            <Trash2 size={17} />
          </button>
        </div>
      </footer>
    </article>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <Check size={28} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}

function ItemForm({ item, onCancel, onSave }) {
  const [formValues, setFormValues] = useState(() => ({
    ...EMPTY_FORM,
    ...item,
    platform: item?.platform || '',
    notes: item?.notes || '',
  }))
  const [saving, setSaving] = useState(false)

  const updateField = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }))
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setSaving(true)
    await onSave({
      title: formValues.title.trim(),
      type: formValues.type,
      status: formValues.status,
      rank: Math.max(1, Number(formValues.rank) || 1),
      platform: formValues.platform.trim(),
      notes: formValues.notes.trim(),
    })
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="item-form" onSubmit={submitForm}>
        <div className="form-header">
          <div>
            <p className="eyebrow">{item ? 'Edit item' : 'New item'}</p>
            <h2>{item ? item.title : 'Add to the queue'}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close form">
            <X size={18} />
          </button>
        </div>

        <label>
          <span>Title</span>
          <input required value={formValues.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>

        <div className="form-grid">
          <label>
            <span>Type</span>
            <select value={formValues.type} onChange={(event) => updateField('type', event.target.value)}>
              <option value="game">Game</option>
              <option value="tv">TV</option>
              <option value="movie">Movie</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={formValues.status} onChange={(event) => updateField('status', event.target.value)}>
              <option value="playing">Playing</option>
              <option value="watching">Watching</option>
              <option value="planned">Planned</option>
              <option value="finished">Finished</option>
              <option value="dropped">Dropped</option>
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            <span>Rank</span>
            <input
              min="1"
              step="1"
              type="number"
              value={formValues.rank}
              onChange={(event) => updateField('rank', event.target.value)}
            />
          </label>
          <label>
            <span>Platform or service</span>
            <input value={formValues.platform} onChange={(event) => updateField('platform', event.target.value)} />
          </label>
        </div>

        <label>
          <span>Notes</span>
          <textarea rows="4" value={formValues.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </label>

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="add-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save item'}
          </button>
        </div>
      </form>
    </div>
  )
}

function getTime(value) {
  if (!value) return 0
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  return new Date(value).getTime()
}

function getRank(item) {
  const rank = Number(item.rank)
  if (Number.isFinite(rank) && rank > 0) return rank
  if (item.priority === 'high') return 1
  if (item.priority === 'medium') return 2
  if (item.priority === 'low') return 3
  return 99
}

function formatDate(value) {
  const time = getTime(value)
  if (!time) return 'Just now'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(time)
}

createRoot(document.getElementById('root')).render(<App />)
