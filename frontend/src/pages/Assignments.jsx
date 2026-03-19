import { useState, useEffect, useCallback } from 'react'
import { Zap, RefreshCw, Bot, CheckCircle2 } from 'lucide-react'
import { getAssignments, assignTask, getTasks } from '../api/api'

export default function Assignments() {
  const [assignments, setAssignments] = useState([])
  const [tasks, setTasks]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [assigning, setAssigning]     = useState(false)
  const [result, setResult]           = useState(null)
  const [msg, setMsg]                 = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, t] = await Promise.all([getAssignments(), getTasks()])
      setAssignments(a)
      setTasks(t)
    } catch {
      setMsg({ type: 'error', text: 'Failed to load data.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleAssignAll = async () => {
    setAssigning(true)
    setResult(null)
    try {
      const res = await assignTask(null)
      setResult(res)
      if (res.assignments?.length > 0) {
        flash('success', `✅ ${res.assignments.length} task(s) assigned using ${res.model_used}!`)
      } else {
        flash('info', res.message || 'No unassigned tasks found.')
      }
      load()
    } catch (err) {
      flash('error', err.response?.data?.error || 'Assignment failed.')
    } finally {
      setAssigning(false)
    }
  }

  const unassigned = tasks.filter(t => !t.assigned)

  return (
    <div>
      <div className="page-header">
        <h1>Smart Assignments</h1>
        <p>AI-powered volunteer-to-task matching using ML predictions</p>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Action Panel */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Run Assignment Engine</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {unassigned.length > 0
                ? `${unassigned.length} unassigned task(s) waiting for volunteers`
                : 'All tasks are currently assigned'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={load}>
              <RefreshCw size={15} />
            </button>
            <button
              className="btn btn-success"
              onClick={handleAssignAll}
              disabled={assigning || unassigned.length === 0}
            >
              <Zap size={16} />
              {assigning ? 'Assigning…' : 'Assign All Unassigned'}
            </button>
          </div>
        </div>

        {/* Latest result */}
        {result?.assignments?.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Latest Assignment Results
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {result.assignments.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  borderRadius: 10, padding: '0.75rem 1rem', flexWrap: 'wrap',
                }}>
                  <CheckCircle2 size={18} color="var(--accent-green)" />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {a.volunteer_name}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      → <span className={`badge badge-${a.task_issue}`}>{a.task_issue}</span> task
                    </p>
                  </div>
                  <div>
                    <div className="score-bar-wrap">
                      <div className="score-bar" style={{ width: 100 }}>
                        <div className="score-fill" style={{ width: `${(a.score * 100).toFixed(0)}%` }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 36 }}>
                        {(a.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="card">
        <div className="section-heading">
          <h2>Assignment History ({assignments.length})</h2>
          <Bot size={18} style={{ color: 'var(--brand-light)' }} />
        </div>

        {loading ? (
          <div className="loader-wrap"><div className="spinner" /></div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <Zap size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
            <p>No assignments yet. Run the engine above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Skill</th>
                  <th>Task Issue</th>
                  <th>Severity</th>
                  <th>Match Score</th>
                  <th>Assigned At</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {a.volunteer_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      {a.volunteer_skill
                        ? <span className={`badge badge-${a.volunteer_skill}`}>{a.volunteer_skill}</span>
                        : '—'}
                    </td>
                    <td>
                      {a.task_issue
                        ? <span className={`badge badge-${a.task_issue}`}>{a.task_issue}</span>
                        : '—'}
                    </td>
                    <td>{a.task_severity ?? '—'}</td>
                    <td>
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{ width: 80 }}>
                          <div className="score-fill" style={{ width: `${((a.score || 0) * 100).toFixed(0)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 36 }}>
                          {((a.score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {a.assigned_at ? new Date(a.assigned_at).toLocaleString() : '—'}
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
