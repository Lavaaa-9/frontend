import { ApiClient } from './client'

// Same-origin /api is the preferred server deployment. No credentials belong in VITE_* values.
const configured = import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1'
if (!configured.startsWith('/') && !/^https?:\/\//.test(configured)) throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL or an absolute application path.')
export const api = new ApiClient(configured)
