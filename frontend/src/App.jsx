import { useEffect, useState } from 'react'
import AppLayout from './layout/AppLayout'
import Loading from './components/Loading'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Policies from './pages/iam/Policies'
import PolicyForm from './pages/iam/PolicyForm'
import PolicyDetail from './pages/iam/PolicyDetail'
import Groups from './pages/iam/Groups'
import Users from './pages/iam/Users'
import Simulator from './pages/iam/Simulator'
import { navigateTo, pathSegments } from './utils/navigation'
import './App.css'

const useCurrentPath = () => {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  return path
}

const NotFound = () => (
  <section className="state">
    <h2>Page not found</h2>
    <p>The console route you opened does not exist.</p>
  </section>
)

const ProtectedRoute = ({ path, children }) => {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigateTo('/login')
    }
  }, [loading, user])

  if (loading) return <Loading label="Checking session" />
  if (!user) return null

  return <AppLayout path={path}>{children}</AppLayout>
}

const RouteSwitch = () => {
  const path = useCurrentPath()
  const segments = pathSegments(path)
  const { user, loading } = useAuth()

  useEffect(() => {
    if (path === '/') {
      navigateTo(user ? '/dashboard' : '/login')
    }
  }, [path, user])

  if (path === '/') return loading ? <Loading label="Starting console" /> : null
  if (path === '/login') return user ? (navigateTo('/dashboard'), null) : <Login />
  if (path === '/register') return user ? (navigateTo('/dashboard'), null) : <Register />

  let page = <NotFound />

  if (path === '/dashboard') page = <Dashboard />
  else if (path === '/iam/policies') page = <Policies />
  else if (path === '/iam/policies/new') page = <PolicyForm />
  else if (path === '/iam/simulator') page = <Simulator />
  else if (segments[0] === 'iam' && segments[1] === 'policies' && segments[2] && segments.length === 3) {
    page = <PolicyDetail id={segments[2]} />
  }
  else if (segments[0] === 'iam' && segments[1] === 'policies' && segments[2] && segments[3] === 'edit') {
    page = <PolicyForm id={segments[2]} />
  }
  else if (segments[0] === 'iam' && segments[1] === 'groups') page = <Groups id={segments[2]} />
  else if (segments[0] === 'iam' && segments[1] === 'users') page = <Users id={segments[2]} />

  return <ProtectedRoute path={path}>{page}</ProtectedRoute>
}

const App = () => (
  <AuthProvider>
    <RouteSwitch />
  </AuthProvider>
)

export default App
