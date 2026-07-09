import { useState, useMemo } from 'react'

const ActionMultiSelect = ({ selectedActions, allActions, onAdd, onRemove }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredGroupedActions = useMemo(() => {
    const groups = {}
    const normalizedQuery = query.toLowerCase().trim()
    allActions.forEach((action) => {
      if (normalizedQuery && !action.toLowerCase().includes(normalizedQuery)) {
        return
      }
      const parts = action.split(':')
      const groupName = parts[0] || 'other'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(action)
    })
    return groups
  }, [allActions, query])

  const hasResults = Object.keys(filteredGroupedActions).length > 0

  return (
    <div className="action-multi-select">
      <div className="selected-chips">
        {selectedActions.map((action) => (
          <span className="action-chip" key={action}>
            {action}
            <button
              type="button"
              className="chip-remove"
              onClick={() => onRemove(action)}
            >
              &times;
            </button>
          </span>
        ))}
        {selectedActions.length === 0 && (
          <span className="muted text-xs">No actions selected</span>
        )}
      </div>

      <div className="search-select mt-2 relative">
        <input
          type="text"
          value={query}
          placeholder="Search and select actions..."
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        {isOpen && (
          <div className="search-options" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {!hasResults ? (
              <span className="search-empty">No matching actions</span>
            ) : (
              Object.entries(filteredGroupedActions).map(([group, groupActions]) => (
                <div key={group} className="border-b border-slate-100 last:border-0 pb-1 mb-1">
                  <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-sm">
                    {group}
                  </div>
                  {groupActions.map((action) => {
                    const isSelected = selectedActions.includes(action)
                    return (
                      <button
                        type="button"
                        key={action}
                        className={`search-option ${isSelected ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          if (isSelected) {
                            onRemove(action)
                          } else {
                            onAdd(action)
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mr-2 pointer-events-none"
                          />
                          <code className="text-xs">{action}</code>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const emptyStatement = () => ({ Effect: 'Allow', Action: [], Resource: ['*'] })

const StatementBuilder = ({ statements, onChange, actions = [] }) => {
  const updateStatement = (index, patch) => {
    onChange(statements.map((statement, current) => (current === index ? { ...statement, ...patch } : statement)))
  }

  const addStatement = () => onChange([...statements, emptyStatement()])
  const removeStatement = (index) => onChange(statements.filter((_, current) => current !== index))

  const addAction = (index, action) => {
    const statement = statements[index]
    if (!statement.Action.includes(action)) {
      updateStatement(index, { Action: [...statement.Action, action] })
    }
  }

  const removeAction = (index, action) => {
    const statement = statements[index]
    updateStatement(index, { Action: statement.Action.filter((item) => item !== action) })
  }

  return (
    <div className="builder-grid">
      <div className="builder-list">
        {statements.map((statement, index) => (
          <section className="tool-panel" key={index}>
            <div className="panel-title-row">
              <h3>Statement {index + 1}</h3>
              {statements.length > 1 && (
                <button type="button" className="icon-command danger" onClick={() => removeStatement(index)} title="Remove statement">
                  X
                </button>
              )}
            </div>

            <label className="field-label">Effect</label>
            <div className="segmented">
              {['Allow', 'Deny'].map((effect) => (
                <button
                  type="button"
                  key={effect}
                  className={statement.Effect === effect ? 'active' : ''}
                  onClick={() => updateStatement(index, { Effect: effect })}
                >
                  {effect}
                </button>
              ))}
            </div>

            <label className="field-label">Actions</label>
            <ActionMultiSelect
              selectedActions={statement.Action}
              allActions={actions}
              onAdd={(action) => addAction(index, action)}
              onRemove={(action) => removeAction(index, action)}
            />

            <label className="field-label mt-4">Resource</label>
            <input value='["*"]' disabled />
          </section>
        ))}

        <button type="button" className="secondary" onClick={addStatement}>Add statement</button>
      </div>

      <aside className="json-preview">
        <h3>Live JSON Preview</h3>
        <pre>{JSON.stringify({ statements }, null, 2)}</pre>
      </aside>
    </div>
  )
}

export default StatementBuilder
