const AccessDenied = ({ message = 'Access denied. Your current IAM permissions do not allow this action.' }) => {
  return (
    <section className="state state-denied">
      <h2>Access Denied</h2>
      <p>{message}</p>
    </section>
  )
}

export default AccessDenied
