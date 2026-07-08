import Link from '../components/Link'
import { useAuth } from '../context/useAuth'

const AppLayout = ({ path, children }) => {
  const { user, logout } = useAuth()
  const currentPath = path || window.location.pathname
  const navItems = [
    ['/dashboard', 'Dashboard'],
    ['/iam/policies', 'Policies'],
    ['/iam/groups', 'Groups'],
    ['/iam/users', 'Users'],
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <strong>IAM Console</strong>
          <span>Self-administered access control</span>
        </div>

        <nav>
          {navItems.map(([to, label]) => (
            <Link key={to} to={to} className={currentPath.startsWith(to) ? 'nav-link active' : 'nav-link'}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="user-box">
          <span>{user?.name}</span>
          <small>{user?.email}</small>
          {user?.isRoot && <strong className="root-badge">Root</strong>}
          <button type="button" className="secondary" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main-surface">{children}</main>
    </div>
  )
}

export default AppLayout
