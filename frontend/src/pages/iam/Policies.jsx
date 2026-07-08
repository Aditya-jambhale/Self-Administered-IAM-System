import { useEffect, useState } from 'react'
import { iamApi } from '../../api/iam'
import AccessDenied from '../../components/AccessDenied'
import Link from '../../components/Link'
import Loading from '../../components/Loading'
import { useAuth } from '../../context/useAuth'

const Policies = () => {
  const { user: currentUser } = useAuth()
  const [policies, setPolicies] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Custom modal state
  const [deletingPolicy, setDeletingPolicy] = useState(null)
  const [fetchingDetails, setFetchingDetails] = useState(false)

  const load = async () => {
    try {
      setPolicies(await iamApi.listPolicies())
    } catch (err) {
      setError(err.status === 403 ? 'denied' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadPolicies = async () => {
      try {
        const policyList = await iamApi.listPolicies()
        if (active) setPolicies(policyList)
      } catch (err) {
        if (active) setError(err.status === 403 ? 'denied' : err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPolicies()
    return () => { active = false }
  }, [])

  const startDelete = async (policy) => {
    setFetchingDetails(true)
    try {
      const details = await iamApi.getPolicy(policy.id)
      setDeletingPolicy(details)
    } catch (err) {
      alert(`Failed to load policy details: ${err.message}`)
    } finally {
      setFetchingDetails(false)
    }
  }

  if (loading || fetchingDetails) return <Loading label={fetchingDetails ? "Checking attachments" : "Loading"} />
  if (error === 'denied') return <AccessDenied />

  return (
    <section className="page-stack">
      <header className="page-header">
        <div><h1>Policies</h1><p>Managed and inline IAM policy documents.</p></div>
        <Link to="/iam/policies/new" className="primary-link">Create Policy</Link>
      </header>
      {error && <p className="message error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Statements</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td><Link to={`/iam/policies/${policy.id}`}>{policy.name}</Link></td>
                <td>{policy.type}</td>
                <td>{policy.statementCount ?? policy.statements?.length ?? 0}</td>
                <td>{new Date(policy.createdAt).toLocaleString()}</td>
                <td className="row-actions">
                  <Link to={`/iam/policies/${policy.id}/edit`}>Edit</Link>
                  <button className="text-danger" onClick={() => startDelete(policy)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletingPolicy && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-title">Delete Policy</h2>
            <div className="modal-body">
              {deletingPolicy.type === 'MANAGED' &&
              ((deletingPolicy.userAttachments?.length > 0) ||
                (deletingPolicy.groupAttachments?.length > 0) ||
                (deletingPolicy.boundaries?.length > 0)) ? (
                currentUser?.isRoot ? (
                  <>
                    <p className="message error mb-4">
                      Warning: This managed policy is currently attached to other resources. Deleting it will detach it from all of them.
                    </p>
                    <p>Are you sure you want to proceed with deleting <strong>{deletingPolicy.name}</strong>?</p>
                  </>
                ) : (
                  <>
                    <p className="message error mb-4">
                      This managed policy cannot be deleted because it is currently attached. Detach it first.
                    </p>
                    <div className="stack-list text-sm">
                      {deletingPolicy.userAttachments?.length > 0 && (
                        <div>
                          <strong>Attached Users:</strong>
                          <div className="chip-list mt-1">
                            {deletingPolicy.userAttachments.map(a => <span className="chip" key={a.user.id}>{a.user.email}</span>)}
                          </div>
                        </div>
                      )}
                      {deletingPolicy.groupAttachments?.length > 0 && (
                        <div className="mt-2">
                          <strong>Attached Groups:</strong>
                          <div className="chip-list mt-1">
                            {deletingPolicy.groupAttachments.map(a => <span className="chip" key={a.group.id}>{a.group.name}</span>)}
                          </div>
                        </div>
                      )}
                      {deletingPolicy.boundaries?.length > 0 && (
                        <div className="mt-2">
                          <strong>Boundaries:</strong>
                          <div className="chip-list mt-1">
                            {deletingPolicy.boundaries.map(b => <span className="chip" key={b.user.id}>{b.user.email}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              ) : (
                <p>Are you sure you want to delete the policy <strong>{deletingPolicy.name}</strong>? This action cannot be undone.</p>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDeletingPolicy(null)}>
                {deletingPolicy.type === 'MANAGED' &&
                ((deletingPolicy.userAttachments?.length > 0) ||
                  (deletingPolicy.groupAttachments?.length > 0) ||
                  (deletingPolicy.boundaries?.length > 0)) &&
                !currentUser?.isRoot
                  ? 'Close'
                  : 'Cancel'}
              </button>
              {(!(deletingPolicy.type === 'MANAGED' &&
                ((deletingPolicy.userAttachments?.length > 0) ||
                  (deletingPolicy.groupAttachments?.length > 0) ||
                  (deletingPolicy.boundaries?.length > 0))) ||
                currentUser?.isRoot) && (
                <button
                  type="button"
                  className="icon-command danger !w-auto px-4"
                  onClick={async () => {
                    try {
                      await iamApi.deletePolicy(deletingPolicy.id)
                      setDeletingPolicy(null)
                      await load()
                    } catch (err) {
                      alert(err.message)
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Policies
