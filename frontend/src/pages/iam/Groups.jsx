import { useEffect, useMemo, useState } from 'react'
import { iamApi } from '../../api/iam'
import AccessDenied from '../../components/AccessDenied'
import Link from '../../components/Link'
import Loading from '../../components/Loading'
import SearchSelect from '../../components/SearchSelect'
import StatusMessage from '../../components/StatusMessage'
import { navigateTo } from '../../utils/navigation'

const emptyGroup = { name: '', description: '' }

const Groups = ({ id }) => {
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [policies, setPolicies] = useState([])
  const [group, setGroup] = useState(null)
  const [form, setForm] = useState(emptyGroup)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Custom delete modal state
  const [deletingGroup, setDeletingGroup] = useState(null)

  const managedPolicies = useMemo(() => policies.filter((policy) => policy.type === 'MANAGED'), [policies])
  const userOptions = useMemo(() => users.map((user) => ({
    value: user.id,
    label: user.email,
    description: user.name,
  })), [users])
  const policyOptions = useMemo(() => managedPolicies.map((policy) => ({
    value: policy.id,
    label: policy.name,
    description: policy.description || policy.type,
  })), [managedPolicies])

  const load = async () => {
    setError('')
    try {
      const [groupList, userList, policyList] = await Promise.all([
        iamApi.listGroups(),
        iamApi.listUsers(),
        iamApi.listPolicies(),
      ])
      setGroups(groupList)
      setUsers(userList)
      setPolicies(policyList)
      setGroup(id ? await iamApi.getGroup(id) : null)
    } catch (err) {
      setError(err.status === 403 ? 'denied' : err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadGroupsPage = async () => {
      setError('')
      try {
        const [groupList, userList, policyList] = await Promise.all([
          iamApi.listGroups(),
          iamApi.listUsers(),
          iamApi.listPolicies(),
        ])
        const groupDetail = id ? await iamApi.getGroup(id) : null
        if (!active) return
        setGroups(groupList)
        setUsers(userList)
        setPolicies(policyList)
        setGroup(groupDetail)
      } catch (err) {
        if (active) setError(err.status === 403 ? 'denied' : err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadGroupsPage()
    return () => { active = false }
  }, [id])

  const createGroup = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const created = await iamApi.createGroup(form)
      setForm(emptyGroup)
      navigateTo(`/iam/groups/${created.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const updateGroup = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await iamApi.updateGroup(id, { name: group.name, description: group.description || '' })
      setSuccess('Group updated.')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const confirmDeleteGroup = async () => {
    if (!deletingGroup) return
    setError('')
    setSuccess('')
    try {
      await iamApi.deleteGroup(deletingGroup.id)
      setDeletingGroup(null)
      if (id) {
        navigateTo('/iam/groups')
      } else {
        await load()
      }
    } catch (err) {
      setError(err.message)
      setDeletingGroup(null)
    }
  }

  const addMember = async () => {
    if (!selectedUser) return
    try {
      await iamApi.addUserToGroup(id, selectedUser)
      setSelectedUser('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const attachPolicy = async () => {
    if (!selectedPolicy) return
    try {
      await iamApi.attachGroupPolicy(id, selectedPolicy)
      setSelectedPolicy('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />
  if (error === 'denied') return <AccessDenied />

  const deleteModal = deletingGroup && (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Delete Group</h2>
        <div className="modal-body">
          <p>Are you sure you want to delete group <strong>{deletingGroup.name}</strong>?</p>
          <p className="mt-2 text-slate-500 text-xs">
            This action will remove all user memberships, delete all its attached INLINE policies, and detach its MANAGED policies.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={() => setDeletingGroup(null)}>Cancel</button>
          <button type="button" className="icon-command danger !w-auto px-4" onClick={confirmDeleteGroup}>Delete</button>
        </div>
      </div>
    </div>
  )

  if (id && group) {
    const memberIds = new Set(group.members.map((member) => member.userId))
    const attachedPolicyIds = new Set(group.policyAttachments.map((attachment) => attachment.policyId))
    const availableUsers = userOptions.filter((user) => !memberIds.has(user.value))
    const availablePolicies = policyOptions.filter((policy) => !attachedPolicyIds.has(policy.value))

    return (
      <section className="page-stack">
        <header className="page-header">
          <div><h1>{group.name}</h1><p>{group.description || 'No description'}</p></div>
          <button className="text-danger" type="button" onClick={() => setDeletingGroup(group)}>Delete Group</button>
        </header>

        <StatusMessage error={error} success={success} />

        <form className="form-grid" onSubmit={updateGroup}>
          <label>Name<input value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} /></label>
          <label>Description<input value={group.description || ''} onChange={(e) => setGroup({ ...group, description: e.target.value })} /></label>
          <button>Save changes</button>
        </form>

        <div className="detail-grid">
          <section className="tool-panel">
            <h3>Members</h3>
            <div className="inline-controls">
              <SearchSelect id="add-group-member" options={availableUsers} value={selectedUser} onChange={setSelectedUser} placeholder="Search users" />
              <button type="button" onClick={addMember}>Add</button>
            </div>
            <div className="stack-list">
              {group.members.map((member) => (
                <div className="list-row" key={member.userId}>
                  <span>{member.user.name}<small>{member.user.email}</small></span>
                  <button type="button" className="text-danger" onClick={async () => { await iamApi.removeUserFromGroup(id, member.userId); await load() }}>Remove</button>
                </div>
              ))}
            </div>
          </section>

          <section className="tool-panel">
            <h3>Policies</h3>
            <div className="inline-controls">
              <SearchSelect id="attach-group-policy" options={availablePolicies} value={selectedPolicy} onChange={setSelectedPolicy} placeholder="Search managed policies" />
              <button type="button" onClick={attachPolicy}>Attach</button>
            </div>
            <div className="stack-list">
              {group.policyAttachments.map((attachment) => (
                <div className="list-row" key={attachment.policyId}>
                  <Link to={`/iam/policies/${attachment.policyId}`}>{attachment.policy.name}</Link>
                  <button type="button" className="text-danger" onClick={async () => { await iamApi.detachGroupPolicy(id, attachment.policyId); await load() }}>Detach</button>
                </div>
              ))}
            </div>
          </section>
        </div>
        {deleteModal}
      </section>
    )
  }

  return (
    <section className="page-stack">
      <header className="page-header"><div><h1>Groups</h1><p>Collect users and attach reusable managed policies.</p></div></header>
      <StatusMessage error={error} />
      <form className="form-grid" onSubmit={createGroup}>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button>Create group</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Members</th><th>Policies</th><th>Created</th><th></th></tr></thead>
          <tbody>{groups.map((item) => (
            <tr key={item.id}>
              <td><Link to={`/iam/groups/${item.id}`}>{item.name}</Link></td>
              <td>{item.description || 'None'}</td><td>{item.memberCount}</td><td>{item.policyCount}</td><td>{new Date(item.createdAt).toLocaleString()}</td>
              <td className="row-actions"><button className="text-danger" onClick={() => setDeletingGroup(item)}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {deleteModal}
    </section>
  )
}

export default Groups
