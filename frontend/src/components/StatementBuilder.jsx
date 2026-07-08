import { useState } from 'react'

const ActionMultiSelect = ({ selectedActions, allActions, onAdd, onRemove }) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filtered = allActions.filter(
    (action) =>
      action.toLowerCase().includes(query.toLowerCase()) &&
      !selectedActions.includes(action)
  )

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
          <div className="search-options">
            {filtered.length === 0 ? (
              <span className="search-empty">No matching actions</span>
            ) : (
              filtered.slice(0, 10).map((action) => (
                <button
                  type="button"
                  className="search-option"
                  key={action}
                  onClick={() => {
                    onAdd(action)
                    setQuery('')
                  }}
                >
                  {action}
                </button>
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
