import { useState } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Volunteers from './pages/Volunteers'
import Tasks from './pages/Tasks'
import Assignments from './pages/Assignments'

const PAGES = {
  dashboard:   Dashboard,
  volunteers:  Volunteers,
  tasks:       Tasks,
  assignments: Assignments,
}

function App() {
  const [page, setPage] = useState('dashboard')
  const Page = PAGES[page] || Dashboard

  return (
    <>
      <div className="bg-mesh" />
      <div className="layout">
        <Sidebar activePage={page} onNavigate={setPage} />
        <main className="main-content">
          <Page />
        </main>
      </div>
    </>
  )
}

export default App
