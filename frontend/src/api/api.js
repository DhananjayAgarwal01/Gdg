import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Volunteers ──────────────────────────────────────────────────────────────
export const getVolunteers   = ()       => api.get('/volunteers').then(r => r.data)
export const addVolunteer    = (data)   => api.post('/volunteer', data).then(r => r.data)
export const deleteVolunteer = (id)     => api.delete(`/volunteer/${id}`).then(r => r.data)

// ── Tasks ───────────────────────────────────────────────────────────────────
export const getTasks   = ()     => api.get('/tasks').then(r => r.data)
export const addTask    = (data) => api.post('/task', data).then(r => r.data)
export const deleteTask = (id)   => api.delete(`/task/${id}`).then(r => r.data)

// ── Assignments ─────────────────────────────────────────────────────────────
export const getAssignments   = ()           => api.get('/assignments').then(r => r.data)
export const assignTask       = (taskId)     => api.post('/assign', taskId ? { task_id: taskId } : {}).then(r => r.data)

// ── Stats & Model ───────────────────────────────────────────────────────────
export const getStats     = () => api.get('/stats').then(r => r.data)
export const getModelInfo = () => api.get('/model-info').then(r => r.data)

export default api
