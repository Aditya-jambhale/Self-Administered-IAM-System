import { useState } from 'react'
import Link from '../components/Link'
import StatusMessage from '../components/StatusMessage'
import { useAuth } from '../context/useAuth'
import { navigateTo } from '../utils/navigation'

const Login = () => {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: 'root@org.local', password: 'root1234' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigateTo('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <h1>Sign in</h1>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <StatusMessage error={error} />
        <button disabled={busy}>{busy ? 'Signing in' : 'Login'}</button>
        <p><Link to="/register">Create an account</Link></p>
      </form>
    </main>
  )
}

export default Login
