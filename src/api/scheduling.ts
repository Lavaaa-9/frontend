import { ApiError } from './client.js'
import type { ApiClient } from './client.js'

export interface AppointmentRecord {
  id: string; patient_id: string; scheduled_start: string; scheduled_end: string
  status: string; appointment_type: string; department_id: string; version: number
}
export interface QueueTicket {
  id: string; patient_id: string; encounter_id: string; ticket_no: number
  status: string; priority: string; department_id: string; version: number
}
export interface AppointmentPage { items: AppointmentRecord[]; next_cursor: string }
export interface QueuePage { items: QueueTicket[] }

export async function listAppointments(client: ApiClient, cursor: string, signal?: AbortSignal): Promise<AppointmentPage> {
  const params = new URLSearchParams({ limit: '25' })
  if (cursor) params.set('cursor', cursor)
  const result = await client.request<AppointmentPage>(`/staff/appointments?${params}`, { signal })
  if (!result || !Array.isArray(result.items) || typeof result.next_cursor !== 'string') {
    throw new ApiError(502, 'invalid_response', 'The appointment service returned an unexpected response.')
  }
  return result
}

export async function listQueue(client: ApiClient, signal?: AbortSignal): Promise<QueuePage> {
  const result = await client.request<QueuePage>('/staff/queue', { signal })
  if (!result || !Array.isArray(result.items)) {
    throw new ApiError(502, 'invalid_response', 'The queue service returned an unexpected response.')
  }
  return result
}
