import { useState, useEffect, useCallback } from 'react'
import { Users, ClipboardList, CheckCircle2, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { getStats } from '../api/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444']

const TOOLTIP_STYLE = {
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
}

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getStats()
      .then(setStats)
      .catch(() => setError('Failed to load stats. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="loader-wrap">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  )

  if (error) return (
    <div style={{ padding: '2rem' }}>
      <div className="alert alert-error">{error}</div>
    </div>
  )

  const taskDistrib = [
    { name: 'Assigned',   value: stats.assigned_tasks },
    { name: 'Unassigned', value: stats.unassigned_tasks },
  ]

  const overviewBars = [
    { name: 'Volunteers', count: stats.total_volunteers },
    { name: 'Tasks',      count: stats.total_tasks },
    { name: 'Assigned',   count: stats.assigned_tasks },
    { name: 'High Urgency', count: stats.high_urgency },
  ]

  const statCards = [
    {
      label: 'Total Volunteers',
      value: stats.total_volunteers,
      icon: Users,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.12)',
    },
    {
      label: 'Total Tasks',
      value: stats.total_tasks,
      icon: ClipboardList,
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.12)',
    },
    {
      label: 'Assigned Tasks',
      value: stats.assigned_tasks,
      icon: CheckCircle2,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'High Urgency',
      value: stats.high_urgency,
      icon: AlertTriangle,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.12)',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time overview of volunteer coordination</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div className="stat-info">
              <h3>{label}</h3>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Model Banner */}
      {stats.model?.model_name && (
        <div className="alert alert-info" style={{ marginBottom: '2rem' }}>
          <Zap size={18} />
          <span>
            Active ML model: <strong>{stats.model.model_name}</strong>
            &nbsp;— Accuracy: <strong>{(stats.model.accuracy * 100).toFixed(1)}%</strong>
            &nbsp;| F1: <strong>{(stats.model.f1_score * 100).toFixed(1)}%</strong>
          </span>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card">
          <div className="section-heading">
            <h2>Overview</h2>
            <TrendingUp size={18} style={{ color: 'var(--brand-light)' }} />
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overviewBars} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {overviewBars.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-heading">
            <h2>Task Assignment</h2>
          </div>
          <div className="chart-container" style={{ display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={taskDistrib}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {taskDistrib.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#22c55e' : '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
