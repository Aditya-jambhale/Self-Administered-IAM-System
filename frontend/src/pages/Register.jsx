import { useState } from 'react'
import * as authApi from '../api/auth'
import Link from '../components/Link'
import StatusMessage from '../components/StatusMessage'
import { navigateTo } from '../utils/navigation'

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await authApi.register(form)
      setSuccess('Account created. Redirecting to login.')
      setTimeout(() => navigateTo('/login'), 700)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <h1>Register</h1>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <StatusMessage error={error} success={success} />
        <button>Create account</button>
        <p><Link to="/login">Back to login</Link></p>
      </form>
    </main>
  )
}

export default Register
