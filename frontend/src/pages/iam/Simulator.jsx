import { useEffect, useState } from 'react'
import { iamApi } from '../../api/iam'
import Loading from '../../components/Loading'
import SearchSelect from '../../components/SearchSelect'
import StatusMessage from '../../components/StatusMessage'
import { useAuth } from '../../context/useAuth'

const Simulator = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [actions, setActions] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const actionPayload = await iamApi.actions()
        setActions(actionPayload.all)

        if (currentUser?.isRoot) {
          const userList = await iamApi.listUsers()
          setUsers(userList)
        } else {
          setSelectedUserId(currentUser?.id || '')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser])

  const runSimulation = async (e) => {
    e.preventDefault()
    if (!selectedUserId || !selectedAction) {
      setError('Please select both a user and an action.')
      return
    }
    setError('')
    setResult(null)
    setSimulating(true)
    try {
      const payload = { action: selectedAction }
      if (currentUser?.isRoot) {
        payload.userId = selectedUserId
      }
      const data = await iamApi.simulate(payload)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSimulating(false)
    }
  }

  if (loading) return <Loading label="Loading simulator" />

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h1>IAM Policy Simulator</h1>
          <p>Test policies and boundaries in real-time, tracing step-by-step permissions evaluation.</p>
        </div>
      </header>

      <StatusMessage error={error} />

      <form className="form-grid" onSubmit={runSimulation}>
        {currentUser?.isRoot ? (
          <label>
            User
            <SearchSelect
              id="simulate-user"
              options={users.map(u => ({ value: u.id, label: u.email, description: u.name }))}
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder="Search and select user"
            />
          </label>
        ) : (
          <label>
            User
            <input value={`${currentUser?.name} (${currentUser?.email})`} disabled />
          </label>
        )}

        <label>
          Action
          <SearchSelect
            id="simulate-action"
            options={actions.map(a => ({ value: a, label: a }))}
            value={selectedAction}
            onChange={setSelectedAction}
            placeholder="Search and select action"
          />
        </label>

        <div className="wide flex justify-end mt-2">
          <button type="submit" disabled={simulating}>
            {simulating ? 'Simulating...' : 'Simulate'}
          </button>
        </div>
      </form>

      {result && (
        <div className="tool-panel mt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-lg font-bold">Simulation Result</h2>
            <span className={`result ${result.allowed ? 'success' : 'denied'}`}>
              {result.allowed ? '✅ ALLOWED' : '❌ DENIED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4 max-sm:grid-cols-1">
            <div>
              <span className="text-slate-400 font-medium block">Target User</span>
              <span className="font-semibold text-slate-900">{result.targetUser.name} ({result.targetUser.email})</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block font-sans">Action</span>
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono inline-block mt-1">{result.action}</code>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Decision</span>
              <strong className={result.allowed ? 'text-emerald-700' : 'text-red-700'}>
                {result.allowed ? 'ALLOW' : 'DENY'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Reason</span>
              <span className="font-semibold text-slate-900">{result.reason}</span>
            </div>
          </div>

          {result.steps && result.steps.length > 0 && (
            <details className="mt-4 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900 outline-none">
                View Evaluation Trace Path ({result.steps.length} steps)
              </summary>
              <ul className="meta-list mt-3 pl-2">
                {result.steps.map((step, idx) => (
                  <li key={idx} className="text-xs py-2 border-b last:border-b-0 border-slate-100 text-slate-600 flex items-start gap-2">
                    <span className="text-slate-300 font-mono">[{idx + 1}]</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

export default Simulator
