const StatusMessage = ({ error, success }) => {
  if (!error && !success) return null

  return <p className={error ? 'message error' : 'message success'}>{error || success}</p>
}

export default StatusMessage
