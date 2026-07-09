import { useEffect, useMemo, useState } from 'react'
import { iamApi } from '../../api/iam'
import AccessDenied from '../../components/AccessDenied'
import EffectivePermissions from '../../components/EffectivePermissions'
import Link from '../../components/Link'
import Loading from '../../components/Loading'
import SearchSelect from '../../components/SearchSelect'
import StatusMessage from '../../components/StatusMessage'
import { useAuth } from '../../context/useAuth'
import { navigateTo } from '../../utils/navigation'

const Users = ({ id }) => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [user, setUser] = useState(null)
  const [policies, setPolicies] = useState([])
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [selectedBoundary, setSelectedBoundary] = useState('')
  const [openGroups, setOpenGroups] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const managedPolicies = useMemo(() => policies.filter((policy) => policy.type === 'MANAGED'), [policies])
  const policyOptions = useMemo(() => managedPolicies.map((policy) => ({
    value: policy.id,
    label: policy.name,
    description: policy.description || policy.type,
  })), [managedPolicies])

  const load = async () => {
    setError('')
    try {
      const [userList, policyList] = await Promise.all([iamApi.listUsers(), iamApi.listPolicies()])
      setUsers(userList)
      setPolicies(policyList)
      setUser(id ? await iamApi.getUser(id) : null)
    } catch (err) {
      setError(err.status === 403 ? 'denied' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadUsersPage = async () => {
      setError('')
      try {
        const [userList, policyList] = await Promise.all([iamApi.listUsers(), iamApi.listPolicies()])
        const userDetail = id ? await iamApi.getUser(id) : null
        if (!active) return
        setUsers(userList)
        setPolicies(policyList)
        setUser(userDetail)
      } catch (err) {
        if (active) setError(err.status === 403 ? 'denied' : err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsersPage()
    return () => { active = false }
  }, [id])

  const attachPolicy = async () => {
    if (!selectedPolicy) return
    setError('')
    setSuccess('')
    try {
      await iamApi.attachUserPolicy(id, selectedPolicy)
      setSelectedPolicy('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const setBoundary = async () => {
    if (!selectedBoundary) return
    setError('')
    setSuccess('')
    try {
      await iamApi.setBoundary(id, selectedBoundary)
      setSelectedBoundary('')
      setSuccess('Boundary updated.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />
  if (error === 'denied') return <AccessDenied />

  if (id && user) {
    const attachedPolicyIds = new Set(user.directPolicies.map((policy) => policy.id))
    const availablePolicyOptions = policyOptions.filter((policy) => !attachedPolicyIds.has(policy.value))
    const canManageBoundary = currentUser?.isRoot && !user.isRoot

    return (
      <section className="page-stack">
        <header className="page-header">
          <div>
            <h1>{user.name}</h1>
            <p>{user.email}{user.isRoot ? ' - root user' : ''}</p>
          </div>
        </header>

        <StatusMessage error={error} success={success} />

        <div className="detail-grid">
          <section className="tool-panel">
            <h3>Direct policies</h3>
            <div className="inline-controls">
              <SearchSelect
                id="attach-user-policy"
                options={availablePolicyOptions}
                value={selectedPolicy}
                onChange={setSelectedPolicy}
                placeholder="Search managed policies"
              />
              <button type="button" onClick={attachPolicy}>Attach</button>
            </div>
            <div className="table-wrap mt-4">
              <table>
                <thead>
                  <tr>
                    <th>Policy Name</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {user.directPolicies.map((policy) => (
                    <tr key={policy.id}>
                      <td><Link to={`/iam/policies/${policy.id}`}>{policy.name}</Link></td>
                      <td><span className="mini-badge">{policy.type}</span></td>
                      <td className="row-actions">
                        <button type="button" className="text-danger" onClick={async () => { await iamApi.detachUserPolicy(id, policy.id); await load() }}>Detach</button>
                      </td>
                    </tr>
                  ))}
                  {user.directPolicies.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center text-slate-400 py-4 text-sm">No direct policies attached</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {canManageBoundary && (
            <section className="tool-panel">
              <h3>Boundary</h3>
              <div className="inline-controls">
                <SearchSelect
                  id="set-user-boundary"
                  options={policyOptions}
                  value={selectedBoundary}
                  onChange={setSelectedBoundary}
                  placeholder="Search managed policies"
                />
                <button type="button" onClick={setBoundary}>Set</button>
              </div>
              {user.boundary ? (
                <div className="mt-4">
                  <div className="list-row boundary-row mb-4">
                    <Link to={`/iam/policies/${user.boundary.id}`}>{user.boundary.name}</Link>
                    <button type="button" className="text-danger" onClick={async () => { await iamApi.removeBoundary(id); await load() }}>Remove</button>
                  </div>
                  <div className="text-xs font-bold text-slate-400 mb-1 uppercase">Boundary Policy Statements:</div>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto max-h-40">
                    {JSON.stringify({ statements: user.boundary.statements }, null, 2)}
                  </pre>
                </div>
              ) : <p className="muted mt-4">No boundary set</p>}
            </section>
          )}
        </div>

        <section className="tool-panel">
          <h3>Groups</h3>
          <div className="table-wrap mt-4">
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Description</th>
                  <th>Attached Policies</th>
                </tr>
              </thead>
              <tbody>
                {user.groups.flatMap((group) => {
                  const open = Boolean(openGroups[group.id])
                  return [
                    <tr key={group.id}>
                      <td className="font-semibold"><Link to={`/iam/groups/${group.id}`}>{group.name}</Link></td>
                      <td>{group.description || 'No description'}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary px-2 py-1 text-xs"
                          onClick={() => setOpenGroups({ ...openGroups, [group.id]: !open })}
                        >
                          {open ? 'Hide policies' : `${group.policies.length} inherited policies`}
                        </button>
                      </td>
                    </tr>,
                    open && (
                      <tr key={`${group.id}-expanded`} className="bg-slate-50/50">
                        <td colSpan="3" className="p-4">
                          <div className="text-xs font-bold text-slate-400 mb-2 uppercase">Policies in Group {group.name}:</div>
                          {group.policies.length === 0 ? (
                            <p className="text-xs text-slate-400">No policies attached to this group</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {group.policies.map((policy) => (
                                <Link
                                  key={policy.id}
                                  to={`/iam/policies/${policy.id}`}
                                  className="chip"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {policy.name} <small className="text-slate-400">({policy.type})</small>
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  ]
                })}
                {user.groups.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center text-slate-400 py-4 text-sm">No group memberships</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tool-panel">
          <h3>Effective permissions</h3>
          <EffectivePermissions permissions={user.effectivePermissions} />
        </section>
      </section>
    )
  }

  return (
    <section className="page-stack">
      <header className="page-header"><div><h1>Users</h1><p>Inspect identities, group membership, direct policies, and boundaries.</p></div></header>
      <StatusMessage error={error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Root</th>
              <th>Groups</th>
              <th>Direct policies</th>
              <th>Boundary</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id} className="interactive-row" onClick={() => navigateTo(`/iam/users/${item.id}`)}>
                <td className="font-semibold text-slate-900">{item.name}</td>
                <td>{item.email}</td>
                <td>{item.isRoot ? <span className="mini-badge">Root</span> : 'No'}</td>
                <td>{item.groupCount}</td>
                <td>{item.directPolicyCount}</td>
                <td>{item.hasBoundary ? 'Yes' : 'No'}</td>
                <td className="text-right text-slate-400 text-xs font-medium">View profile &rarr;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Users
