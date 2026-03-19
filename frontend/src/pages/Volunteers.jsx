import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Trash2, RefreshCw } from 'lucide-react'
import { getVolunteers, addVolunteer, deleteVolunteer } from '../api/api'

const SKILLS = ['medical', 'food', 'education', 'rescue']

const EMPTY = {
  name: '', skill: 'medical',
  latitude: '', longitude: '',
  availability: true, experience: 0,
}

const skillBadge = (skill) => (
  <span className={`badge badge-${skill}`}>{skill}</span>
)

export default function Volunteers() {
  const [vols, setVols]       = useState([])
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getVolunteers()
      .then(setVols)
      .catch(() => setMsg({ type: 'error', text: 'Failed to load volunteers.' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await addVolunteer({
        ...form,
        latitude:    parseFloat(form.latitude),
        longitude:   parseFloat(form.longitude),
        experience:  parseInt(form.experience),
        availability: form.availability === true || form.availability === 'true',
      })
      flash('success', 'Volunteer added!')
      setForm(EMPTY)
      load()
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to add volunteer.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this volunteer?')) return
    try {
      await deleteVolunteer(id)
      flash('success', 'Volunteer removed.')
      load()
    } catch {
      flash('error', 'Failed to delete.')
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <h1>Volunteers</h1>
        <p>Manage registered volunteers and their skills</p>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Add Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="section-heading">
          <h2>Add Volunteer</h2>
          <UserPlus size={18} style={{ color: 'var(--brand-light)' }} />
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input required placeholder="e.g. Priya Sharma" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label>Skill</label>
              <select value={form.skill} onChange={set('skill')}>
                {SKILLS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Latitude</label>
              <input required type="number" step="any" placeholder="e.g. 28.6139" value={form.latitude} onChange={set('latitude')} />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input required type="number" step="any" placeholder="e.g. 77.2090" value={form.longitude} onChange={set('longitude')} />
            </div>
            <div className="form-group">
              <label>Experience (0–5)</label>
              <input required type="number" min="0" max="5" value={form.experience} onChange={set('experience')} />
            </div>
            <div className="form-group">
              <label>Availability</label>
              <select value={String(form.availability)} onChange={e => setForm(f => ({ ...f, availability: e.target.value === 'true' }))}>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <UserPlus size={16} />
              {saving ? 'Adding…' : 'Add Volunteer'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-heading">
          <h2>All Volunteers ({vols.length})</h2>
          <button className="btn btn-primary" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : vols.length === 0 ? (
          <div className="empty-state">
            <UserPlus size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
            <p>No volunteers yet. Add one above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Skill</th>
                  <th>Location</th>
                  <th>Availability</th>
                  <th>Experience</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vols.map(v => (
                  <tr key={v.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</td>
                    <td>{skillBadge(v.skill)}</td>
                    <td>{parseFloat(v.latitude).toFixed(3)}, {parseFloat(v.longitude).toFixed(3)}</td>
                    <td>
                      <span className={`badge ${v.availability ? 'badge-assigned' : 'badge-pending'}`}>
                        {v.availability ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          display: 'flex', gap: 3,
                        }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: i < v.experience ? 'var(--brand)' : 'var(--border)',
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{v.experience}/5</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(v.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
