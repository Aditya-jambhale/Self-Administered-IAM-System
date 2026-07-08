import { navigateTo } from '../utils/navigation'

const Link = ({ to, className = '', children }) => {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        navigateTo(to)
      }}
    >
      {children}
    </a>
  )
}

export default Link
