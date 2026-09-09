/**
 * IntegriSense AI — Centralized API Client
 *
 * Automatically detects whether to use relative /api path (Firebase Hosting rewrites)
 * or explicit backend host (local dev http://localhost:8080).
 */

const RAW_BASE_URL = import.meta.env['VITE_API_BASE_URL'];
const BASE_URL = RAW_BASE_URL !== undefined && RAW_BASE_URL !== '' ? RAW_BASE_URL : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${BASE_URL}${normalizedPath}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getIntegrations: () => request<import('../types').Integration[]>('/integrations'),
  getIncidents: (status?: 'active' | 'resolved') =>
    request<import('../types').Incident[]>(`/incidents${status ? `?status=${status}` : ''}`),
  getRiskScores: () => request<import('../types').RiskScore[]>('/risk'),
  simulate: (scenario: string) =>
    request<import('../types').SimulateResponse>('/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),
  approveRecovery: (id: string) =>
    request<import('../types').RecoveryAction>(`/recovery/${id}/approve`, { method: 'POST', body: '{}' }),
  rejectRecovery: (id: string) =>
    request<import('../types').RecoveryAction>(`/recovery/${id}/reject`, { method: 'POST', body: '{}' }),
  chatWithCopilot: (question: string, userLocalTime?: string) =>
    request<{ question: string; response: string; timestamp: string }>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        userLocalTime: userLocalTime ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }),
    }),
  getAgentActivities: () =>
    request<import('../types').AgentActivity[]>('/copilot/activities'),
};
