import { useState, useEffect } from 'react'
import { callResourceAction, listResources } from '../api/resources'

const Dashboard = () => {
  const [results, setResults] = useState({})
  const [groupedResourceActions, setGroupedResourceActions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    const fetchResources = async () => {
      try {
        const data = await listResources()
        if (!active) return

        const grouped = data.reduce((acc, item) => {
          acc[item.group] = acc[item.group] || []
          acc[item.group].push(item)
          return acc
        }, {})

        setGroupedResourceActions(grouped)
        setLoading(false)
      } catch (err) {
        if (!active) return
        setError(err.message || 'Failed to load resources')
        setLoading(false)
      }
    }

    fetchResources()
    return () => {
      active = false
    }
  }, [])

  const runAction = async (item) => {
    setResults((current) => ({ ...current, [item.action]: { status: 'running', message: 'Checking' } }))

    try {
      await callResourceAction(item)
      setResults((current) => ({ ...current, [item.action]: { status: 'success', message: 'Success' } }))
    } catch (err) {
      setResults((current) => ({
        ...current,
        [item.action]: {
          status: err.status === 403 ? 'denied' : 'error',
          message: err.status === 403 ? 'Access Denied' : err.message,
        },
      }))
    }
  }

  if (loading) {
    return (
      <section className="page-stack">
        <header className="page-header">
          <div>
            <h1>Resource Dashboard</h1>
            <p>Loading resource actions from backend...</p>
          </div>
        </header>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page-stack">
        <header className="page-header">
          <div>
            <h1>Resource Dashboard</h1>
            <p style={{ color: '#ef4444' }}>Error: {error}</p>
          </div>
        </header>
      </section>
    )
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h1>Resource Dashboard</h1>
          <p>Run each protected backend route and verify IAM middleware decisions.</p>
        </div>
      </header>

      {Object.entries(groupedResourceActions).map(([group, actions]) => (
        <section className="resource-section" key={group}>
          <h2>{group}</h2>
          <div className="action-grid">
            {actions.map((item) => {
              const result = results[item.action]
              return (
                <button type="button" className="action-tile" key={item.action} onClick={() => runAction(item)}>
                  <span>{item.label}</span>
                  <code>{item.action}</code>
                  <small>{item.method} {item.path}</small>
                  {result && <strong className={`result ${result.status}`}>{result.message}</strong>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </section>
  )
}

export default Dashboard
