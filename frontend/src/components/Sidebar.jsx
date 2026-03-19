import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, ClipboardList, Zap, Activity } from 'lucide-react'
import { getModelInfo } from '../api/api'

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'volunteers',  label: 'Volunteers',   icon: Users },
  { id: 'tasks',       label: 'Tasks',        icon: ClipboardList },
  { id: 'assignments', label: 'Assignments',  icon: Zap },
]

export default function Sidebar({ activePage, onNavigate }) {
  const [modelInfo, setModelInfo] = useState(null)

  useEffect(() => {
    getModelInfo().then(setModelInfo).catch(() => {})
  }, [])

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#3b82f6,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Activity size={16} color="#fff" />
          </div>
          <h2>Smart Resource<br/>Allocation</h2>
        </div>
        <p>NGO Volunteer Coordination</p>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {modelInfo && (
          <div className="model-badge">
            <p>Active Model</p>
            <span>{modelInfo.model_name}</span>
            <p style={{ marginTop: 4 }}>Accuracy: {(modelInfo.accuracy * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>
    </aside>
  )
}
