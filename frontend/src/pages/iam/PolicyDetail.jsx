import { useEffect, useState } from 'react'
import { iamApi } from '../../api/iam'
import AccessDenied from '../../components/AccessDenied'
import Link from '../../components/Link'
import Loading from '../../components/Loading'

const AttachmentList = ({ title, items, getName }) => (
  <section className="tool-panel">
    <h3>{title}</h3>
    {items.length === 0 ? <p className="muted">None</p> : (
      <div className="chip-list">
        {items.map((item) => <span className="chip" key={getName(item)}>{getName(item)}</span>)}
      </div>
    )}
  </section>
)

const PolicyDetail = ({ id }) => {
  const [policy, setPolicy] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setPolicy(await iamApi.getPolicy(id))
      } catch (err) {
        setError(err.status === 403 ? 'denied' : err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <Loading />
  if (error === 'denied') return <AccessDenied />
  if (error) return <p className="message error">{error}</p>

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <h1>{policy.name}</h1>
          <p>{policy.description || 'No description'}</p>
        </div>
        <Link to={`/iam/policies/${policy.id}/edit`} className="primary-link">Edit Policy</Link>
      </header>

      <div className="detail-grid">
        <section className="tool-panel">
          <h3>Policy document</h3>
          <dl className="meta-list">
            <div><dt>Type</dt><dd>{policy.type}</dd></div>
            <div><dt>Statements</dt><dd>{policy.statements?.length || 0}</dd></div>
            <div><dt>Created</dt><dd>{new Date(policy.createdAt).toLocaleString()}</dd></div>
          </dl>
          <pre>{JSON.stringify({ statements: policy.statements }, null, 2)}</pre>
        </section>

        <div className="page-stack compact">
          <AttachmentList title="Attached users" items={policy.userAttachments || []} getName={(item) => item.user.email} />
          <AttachmentList title="Attached groups" items={policy.groupAttachments || []} getName={(item) => item.group.name} />
          <AttachmentList title="Permission boundaries" items={policy.boundaries || []} getName={(item) => item.user.email} />
        </div>
      </div>
    </section>
  )
}

export default PolicyDetail
