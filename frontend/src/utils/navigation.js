export const navigateTo = (path) => {
  if (window.location.pathname === path) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }

  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export const pathSegments = (path = window.location.pathname) => path.split('/').filter(Boolean)
