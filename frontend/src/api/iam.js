import { request } from './client'

export const iamApi = {
  actions: () => request('/api/iam/actions'),

  listPolicies: () => request('/api/iam/policies'),
  getPolicy: (id) => request(`/api/iam/policies/${id}`),
  createPolicy: (payload) => request('/api/iam/policies', { method: 'POST', body: payload }),
  updatePolicy: (id, payload) => request(`/api/iam/policies/${id}`, { method: 'PUT', body: payload }),
  deletePolicy: (id) => request(`/api/iam/policies/${id}`, { method: 'DELETE' }),

  listGroups: () => request('/api/iam/groups'),
  getGroup: (id) => request(`/api/iam/groups/${id}`),
  createGroup: (payload) => request('/api/iam/groups', { method: 'POST', body: payload }),
  updateGroup: (id, payload) => request(`/api/iam/groups/${id}`, { method: 'PUT', body: payload }),
  deleteGroup: (id) => request(`/api/iam/groups/${id}`, { method: 'DELETE' }),
  addUserToGroup: (id, userId) => request(`/api/iam/groups/${id}/members`, { method: 'POST', body: { userId } }),
  removeUserFromGroup: (id, userId) => request(`/api/iam/groups/${id}/members/${userId}`, { method: 'DELETE' }),
  attachGroupPolicy: (id, policyId) => request(`/api/iam/groups/${id}/policies`, { method: 'POST', body: { policyId } }),
  detachGroupPolicy: (id, policyId) => request(`/api/iam/groups/${id}/policies/${policyId}`, { method: 'DELETE' }),

  listUsers: () => request('/api/iam/users'),
  getUser: (id) => request(`/api/iam/users/${id}`),
  attachUserPolicy: (id, policyId) => request(`/api/iam/users/${id}/policies`, { method: 'POST', body: { policyId } }),
  detachUserPolicy: (id, policyId) => request(`/api/iam/users/${id}/policies/${policyId}`, { method: 'DELETE' }),
  setBoundary: (id, policyId) => request(`/api/iam/users/${id}/boundary`, { method: 'PUT', body: { policyId } }),
  removeBoundary: (id) => request(`/api/iam/users/${id}/boundary`, { method: 'DELETE' }),
  simulate: (payload) => request('/api/iam/simulate', { method: 'POST', body: payload }),
}
