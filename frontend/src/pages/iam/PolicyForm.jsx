import { useEffect, useState } from 'react'
import { iamApi } from '../../api/iam'
import AccessDenied from '../../components/AccessDenied'
import Loading from '../../components/Loading'
import StatementBuilder from '../../components/StatementBuilder'
import StatusMessage from '../../components/StatusMessage'
import SearchSelect from '../../components/SearchSelect'
import { navigateTo } from '../../utils/navigation'

const blankStatement = { Effect: 'Allow', Action: [], Resource: ['*'] }

const PolicyForm = ({ id }) => {
  const editing = Boolean(id)
  const [actions, setActions] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'MANAGED',
    statements: [blankStatement],
    ownerType: 'USER',
    userId: '',
    groupId: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [actionPayload, userList, groupList] = await Promise.all([
          iamApi.actions(),
          iamApi.listUsers(),
          iamApi.listGroups()
        ])
        setActions(actionPayload.all)
        setUsers(userList)
        setGroups(groupList)

        if (editing) {
          const policy = await iamApi.getPolicy(id)
          let ownerType = 'USER'
          let userId = ''
          let groupId = ''
          if (policy.userAttachments && policy.userAttachments.length > 0) {
            ownerType = 'USER'
            userId = policy.userAttachments[0].user.id
          } else if (policy.groupAttachments && policy.groupAttachments.length > 0) {
            ownerType = 'GROUP'
            groupId = policy.groupAttachments[0].group.id
          }

          setForm({
            name: policy.name,
            description: policy.description || '',
            type: policy.type,
            statements: policy.statements || [blankStatement],
            ownerType,
            userId,
            groupId
          })
        }
      } catch (err) {
        setError(err.status === 403 ? 'denied' : err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [editing, id])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        statements: form.statements
      }

      if (form.type === 'INLINE' && !editing) {
        if (form.ownerType === 'USER') {
          if (!form.userId) throw new Error('You must select a user to assign this inline policy to.')
          payload.userId = form.userId
        } else {
          if (!form.groupId) throw new Error('You must select a group to assign this inline policy to.')
          payload.groupId = form.groupId
        }
      }

      const saved = editing ? await iamApi.updatePolicy(id, payload) : await iamApi.createPolicy(payload)
      navigateTo(`/iam/policies/${saved.id || id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />
  if (error === 'denied') return <AccessDenied />

  return (
    <section className="page-stack">
      <header className="page-header"><div><h1>{editing ? 'Edit Policy' : 'Create Policy'}</h1><p>Build statements with controls, then preview the JSON.</p></div></header>
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Type<select value={form.type} disabled={editing} onChange={(e) => setForm({ ...form, type: e.target.value, userId: '', groupId: '' })}><option>MANAGED</option><option>INLINE</option></select></label>
          
          {form.type === 'INLINE' && (
            <>
              <label>Assign to<select value={form.ownerType} disabled={editing} onChange={(e) => setForm({ ...form, ownerType: e.target.value, userId: '', groupId: '' })}><option value="USER">User</option><option value="GROUP">Group</option></select></label>
              <label>
                {form.ownerType === 'USER' ? 'User' : 'Group'}
                {editing ? (
                  <input
                    value={
                      form.ownerType === 'USER'
                        ? users.find((u) => u.id === form.userId)?.email || form.userId
                        : groups.find((g) => g.id === form.groupId)?.name || form.groupId
                    }
                    disabled
                  />
                ) : form.ownerType === 'USER' ? (
                  <SearchSelect
                    id="assign-user-select"
                    options={users.map((u) => ({ value: u.id, label: u.email, description: u.name }))}
                    value={form.userId}
                    onChange={(val) => setForm({ ...form, userId: val })}
                    placeholder="Search users"
                  />
                ) : (
                  <SearchSelect
                    id="assign-group-select"
                    options={groups.map((g) => ({ value: g.id, label: g.name, description: g.description }))}
                    value={form.groupId}
                    onChange={(val) => setForm({ ...form, groupId: val })}
                    placeholder="Search groups"
                  />
                )}
              </label>
            </>
          )}

          <label className="wide">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        </div>
        <StatementBuilder actions={actions} statements={form.statements} onChange={(statements) => setForm({ ...form, statements })} />
        <StatusMessage error={error} />
        <button>Save policy</button>
      </form>
    </section>
  )
}

export default PolicyForm
