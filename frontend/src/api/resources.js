import { request } from './client'

export const callResourceAction = ({ method, path }) => request(path, { method })

export const listResources = () => request('/api/resources')
