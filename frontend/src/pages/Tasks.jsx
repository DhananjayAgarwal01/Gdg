import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusCircle, Trash2, RefreshCw, AlertTriangle, Wand2, Sparkles } from 'lucide-react'
import { getTasks, addTask, deleteTask, analyzeReport } from '../api/api'

const ISSUE_TYPES = ['medical', 'food', 'education', 'rescue']

const EMPTY = {
  latitude: '', longitude: '', issue_type: 'medical',
  severity: 5, people_affected: 50, date: '',
}

const urgencyClass = (sev, people) => {
  const u = sev * people
  if (u >= 1000) return 'urgency-high'
  if (u >= 300)  return 'urgency-medium'
  return 'urgency-low'
}

export default function Tasks() {
  const [tasks, setTasks]     = useState([])
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)
  const [reportText, setReportText] = useState('')
  const [analyzing, setAnalyzing]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getTasks()
      .then(setTasks)
      .catch(() => setMsg({ type: 'error', text: 'Failed to load tasks.' }))
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
      await addTask({
        ...form,
        latitude:        parseFloat(form.latitude),
        longitude:       parseFloat(form.longitude),
        severity:        parseInt(form.severity),
        people_affected: parseInt(form.people_affected),
      })
      flash('success', 'Task added!')
      setForm(EMPTY)
      load()
    } catch (err) {
      flash('error', err.response?.data?.error || 'Failed to add task.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(id)
      flash('success', 'Task deleted.')
      load()
    } catch {
      flash('error', 'Failed to delete.')
    }
  }

  const handleAnalyze = async () => {
    if (!reportText.trim()) return
    setAnalyzing(true)
    try {
      const data = await analyzeReport(reportText)
      setForm({
        ...EMPTY,
        ...data,
        date: data.date || new Date().toISOString().split('T')[0],
      })
      flash('success', '✨ Report analyzed! Form auto-populated.')
      setReportText('')
    } catch (err) {
      flash('error', err.response?.data?.error || 'AI analysis failed. Check your API key.')
    } finally {
      setAnalyzing(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <h1>Tasks</h1>
        <p>Manage community tasks awaiting volunteer assignment</p>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Smart Import */}
        <motion.div 
          className="card" 
          style={{ height: 'fit-content' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -5 }}
        >
          <div className="section-heading">
            <h2>AI Smart Import</h2>
            <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Paste raw situation reports here to auto-fill the task form using Gemini AI.
          </p>
          <textarea
            placeholder="e.g. There is a medical emergency in Mumbai at (19.07, 72.87) affecting roughly 100 people due to flooding..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            style={{
              width: '100%', minHeight: '120px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem',
              color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical',
              marginBottom: '1rem',
            }}
          />
          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={handleAnalyze}
            disabled={analyzing || !reportText.trim()}
          >
            {analyzing ? (
              <><div className="spinner" style={{ width: 14, height: 14, borderLeftColor: '#fff' }} /> Analyzing...</>
            ) : (
              <><Wand2 size={16} /> Magic Fill</>
            )}
          </button>
        </motion.div>

        {/* Add Form */}
        <motion.div 
          className="card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
        >
          <div className="section-heading">
            <h2>Add Task</h2>
            <PlusCircle size={18} style={{ color: 'var(--brand-light)' }} />
          </div>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="form-group">
                <label>Issue Type</label>
                <select value={form.issue_type} onChange={set('issue_type')}>
                  {ISSUE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Latitude</label>
                <input required type="number" step="any" placeholder="e.g. 19.0760" value={form.latitude} onChange={set('latitude')} />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input required type="number" step="any" placeholder="e.g. 72.8777" value={form.longitude} onChange={set('longitude')} />
              </div>
              <div className="form-group">
                <label>Severity (1–10)</label>
                <input required type="number" min="1" max="10" value={form.severity} onChange={set('severity')} />
              </div>
              <div className="form-group">
                <label>People Affected</label>
                <input required type="number" min="1" value={form.people_affected} onChange={set('people_affected')} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input required type="date" value={form.date} onChange={set('date')} />
              </div>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <PlusCircle size={16} />
                {saving ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="section-heading">
          <h2>All Tasks ({tasks.length})</h2>
          <button className="btn btn-primary" onClick={load}>
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
            <p>No tasks yet. Add one above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Issue Type</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>People Affected</th>
                  <th>Urgency</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <motion.tbody layout>
                <AnimatePresence mode='popLayout'>
                  {tasks.map(t => {
                    const urgency = t.severity * t.people_affected
                    return (
                      <motion.tr 
                        key={t.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ spring: { damping: 20, stiffness: 300 } }}
                      >
                        <td><span className={`badge badge-${t.issue_type}`}>{t.issue_type}</span></td>
                        <td>{parseFloat(t.latitude).toFixed(3)}, {parseFloat(t.longitude).toFixed(3)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div key={i} style={{
                                width: 7, height: 7, borderRadius: 2,
                                background: i < t.severity
                                  ? (t.severity >= 7 ? 'var(--accent-red)' : t.severity >= 4 ? 'var(--accent-yellow)' : 'var(--accent-green)')
                                  : 'var(--border)',
                              }} />
                            ))}
                          </div>
                        </td>
                        <td>{t.people_affected.toLocaleString()}</td>
                        <td>
                          <span className={urgencyClass(t.severity, t.people_affected)}>
                            {urgency >= 1000 ? '🔴' : urgency >= 300 ? '🟡' : '🟢'} {urgency.toLocaleString()}
                          </span>
                        </td>
                        <td>{t.date}</td>
                        <td>
                          <span className={`badge ${t.assigned ? 'badge-assigned' : 'badge-pending'}`}>
                            {t.assigned ? 'Assigned' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  )
}
