const EffectivePermissions = ({ permissions = {} }) => {
  return (
    <div className="permission-summary">
      {Object.entries(permissions).map(([namespace, actions]) => (
        <section className="permission-band" key={namespace}>
          <h3>{namespace}</h3>
          <div className="permission-list">
            {actions.map((item) => (
              <div className="permission-row" key={item.action}>
                <span>{item.action}</span>
                <strong className={item.allowed ? 'allowed' : 'denied'}>{item.allowed ? 'Allowed' : 'Denied'}</strong>
                <small>{item.reason}</small>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default EffectivePermissions
